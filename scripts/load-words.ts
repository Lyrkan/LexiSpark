import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createBloomFilter } from "../lib/bloomFilter.js";
import {
  englishCategories,
  frenchCategories,
  evaluateRule,
  CategoryDefinition,
  CategoryRule,
} from "../lib/categories.js";
import { normalizeText, removeDuplicatesNormalized } from "../lib/textUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface DictionaryConfig {
  language: string;
  filename: string;
  categories: CategoryDefinition[];
}

const dictionaries: DictionaryConfig[] = [
  {
    language: "en",
    filename: "words-en.txt",
    categories: englishCategories,
  },
  {
    language: "fr",
    filename: "words-fr.txt",
    categories: frenchCategories,
  },
];

async function createCategory(
  category: CategoryDefinition,
  language: string,
  words: string[],
  parentId?: number,
): Promise<void> {
  // If this is a parent category (with subcategories)
  if (category.subcategories) {
    const parent = await prisma.category.create({
      data: {
        name: category.name,
        description: category.description,
        language: language,
        isParent: true,
        parentId: parentId,
      },
    });

    // Recursively create subcategories
    for (const subcategory of category.subcategories) {
      await createCategory(subcategory, language, words, parent.id);
    }
    return;
  }

  // This is a leaf category with actual rules
  if (!category.rules) {
    throw new Error(
      `Category ${category.name} has no rules and no subcategories`,
    );
  }

  // Get words for this category using normalized versions for matching
  const categoryWords = words
    .filter((w) =>
      evaluateRule(category.rules as CategoryRule, normalizeText(w)),
    )
    .sort((a, b) => normalizeText(a).localeCompare(normalizeText(b)));

  // Create bloom filter using normalized words
  const bloomFilter = createBloomFilter(categoryWords);

  // Create category
  const createdCategory = await prisma.category.create({
    data: {
      name: category.name,
      description: category.description,
      language: language,
      isParent: false,
      parentId: parentId,
      type: category.rules.type,
      rules: JSON.stringify(category.rules),
      bloomFilter: Buffer.from(bloomFilter),
    },
  });

  // Connect words
  for (const word of categoryWords) {
    const wordRecord = await prisma.word.findUnique({
      where: {
        word_language: {
          word: word.toLowerCase(),
          language: language,
        },
      },
    });

    if (wordRecord) {
      await prisma.category.update({
        where: { id: createdCategory.id },
        data: {
          words: {
            connect: { id: wordRecord.id },
          },
        },
      });
    }
  }

  console.log(
    `Created category: ${category.name} with ${categoryWords.length} words`,
  );
}

async function main() {
  try {
    // Clear existing data
    await prisma.category.deleteMany();
    await prisma.word.deleteMany();

    for (const dict of dictionaries) {
      // Read words from file
      const wordsPath = path.join(__dirname, "../data", dict.filename);

      if (!fs.existsSync(wordsPath)) {
        console.warn(
          `Warning: Dictionary file ${dict.filename} not found, skipping...`,
        );
        continue;
      }

      const words = removeDuplicatesNormalized(
        fs
          .readFileSync(wordsPath, "utf-8")
          .split("\n")
          .map((w) => w.trim())
          .filter((w) => w.length > 0)
          .filter((w) => /^[a-zA-ZÀ-ÿœŒæÆ]+$/.test(w)), // Only keep words with letters, accented characters and ligatures
      );

      // Create words in database with normalized versions
      console.log(`Creating words for ${dict.language}...`);
      await prisma.word.createMany({
        data: words.map((word) => ({
          word: word.toLowerCase(),
          normalized: normalizeText(word),
          length: normalizeText(word).length,
          language: dict.language,
        })),
      });

      // Create categories
      console.log(`Creating categories for ${dict.language}...`);
      for (const category of dict.categories) {
        await createCategory(category, dict.language, words);
      }
    }

    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
