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
import crypto from "crypto";

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

// Helper function to compute hash of content
function computeHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Helper function to compute hash for a word list
function computeWordListHash(words: string[]): string {
  const sortedWords = [...words].sort();
  return computeHash(sortedWords.join("\n"));
}

// Helper function to compute hash for a category
function computeCategoryHash(words: string[], rules: CategoryRule): string {
  const sortedWords = [...words].sort();
  return computeHash(JSON.stringify(rules) + "\n" + sortedWords.join("\n"));
}

async function updateCategory(
  category: CategoryDefinition,
  language: string,
  words: string[],
  parentId?: number,
): Promise<boolean> {
  // If this is a parent category (with subcategories)
  if (category.subcategories) {
    // First check if any subcategories have words
    let hasValidSubcategories = false;

    // Find or create the parent category first
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: category.name,
        language: language,
      },
      include: {
        children: true,
      },
    });

    const parent =
      existingCategory ||
      (await prisma.category.create({
        data: {
          name: category.name,
          description: category.description,
          language: language,
          isParent: true,
          parentId: parentId,
        },
      }));

    // Update parent category if it exists and needs updates
    if (
      existingCategory &&
      (existingCategory.description !== category.description ||
        existingCategory.parentId !== parentId)
    ) {
      await prisma.category.update({
        where: { id: existingCategory.id },
        data: {
          description: category.description,
          parentId: parentId,
        },
      });
    }

    // Process all subcategories
    for (const subcategory of category.subcategories) {
      const subcategoryHasWords = await updateCategory(
        subcategory,
        language,
        words,
        parent.id, // Pass the parent's ID to establish the relationship
      );
      if (subcategoryHasWords) {
        hasValidSubcategories = true;
      }
    }

    // If no subcategories have words, remove this parent category
    if (!hasValidSubcategories) {
      console.log(
        `Removing parent category ${category.name} as it has no valid subcategories with words`,
      );
      if (existingCategory) {
        await prisma.category.delete({
          where: { id: existingCategory.id },
        });
      }
      return false;
    }

    return true;
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

  // Skip categories with no words
  if (categoryWords.length === 0) {
    console.log(
      `Skipping category ${category.name} as it has no matching words`,
    );

    // If the category exists, delete it since it no longer has words
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: category.name,
        language: language,
      },
    });

    if (existingCategory) {
      await prisma.category.delete({
        where: { id: existingCategory.id },
      });
      console.log(`Deleted empty category ${category.name}`);
    }

    return false;
  }

  // Compute hash for the category's content
  const expectedHash = computeCategoryHash(categoryWords, category.rules);

  // Check if category exists and has the same hash
  const existingCategory = await prisma.category.findFirst({
    where: {
      name: category.name,
      language: language,
    },
  });

  if (
    existingCategory &&
    existingCategory.contentHash === expectedHash &&
    existingCategory.parentId === parentId
  ) {
    console.log(`Category ${category.name} is up to date, skipping...`);
    return true;
  }

  // Create bloom filter using normalized words
  const bloomFilter = createBloomFilter(categoryWords);

  if (existingCategory) {
    // Update existing category
    const updatedCategory = await prisma.category.update({
      where: { id: existingCategory.id },
      data: {
        description: category.description,
        type: category.rules.type,
        rules: JSON.stringify(category.rules),
        bloomFilter: Buffer.from(bloomFilter),
        parentId: parentId,
        contentHash: expectedHash,
        words: { set: [] }, // Clear existing word connections
      },
    });

    // Reconnect words
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
          where: { id: updatedCategory.id },
          data: {
            words: {
              connect: { id: wordRecord.id },
            },
          },
        });
      }
    }

    console.log(
      `Updated category: ${category.name} with ${categoryWords.length} words`,
    );
  } else {
    // Create new category
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
        contentHash: expectedHash,
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

  return true;
}

async function updateWords(words: string[], language: string): Promise<void> {
  // Compute hash of the word list
  const expectedHash = computeWordListHash(words);

  // Check if we have the same hash in the database
  const languageWordList = await prisma.languageWordList.findUnique({
    where: { language },
  });

  if (languageWordList && languageWordList.contentHash === expectedHash) {
    console.log(`Word list for ${language} is up to date, skipping...`);
    return;
  }

  // Get existing words for this language
  const existingWords = await prisma.word.findMany({
    where: { language },
    select: { word: true },
  });
  const existingWordSet = new Set(existingWords.map((w) => w.word));

  // Find words to add (words in file but not in DB)
  const wordsToAdd = words.filter((w) => !existingWordSet.has(w.toLowerCase()));
  if (wordsToAdd.length > 0) {
    await prisma.word.createMany({
      data: wordsToAdd.map((word) => ({
        word: word.toLowerCase(),
        normalized: normalizeText(word),
        length: normalizeText(word).length,
        language: language,
      })),
    });
    console.log(`Added ${wordsToAdd.length} new words for ${language}`);
  }

  // Find words to remove (words in DB but not in file)
  const wordsInFileSet = new Set(words.map((w) => w.toLowerCase()));
  const wordsToRemove = Array.from(existingWordSet).filter(
    (w) => !wordsInFileSet.has(w),
  );
  if (wordsToRemove.length > 0) {
    await prisma.word.deleteMany({
      where: {
        language,
        word: { in: wordsToRemove },
      },
    });
    console.log(
      `Removed ${wordsToRemove.length} obsolete words for ${language}`,
    );
  }

  // Update or create the language word list hash
  await prisma.languageWordList.upsert({
    where: { language },
    create: {
      language,
      contentHash: expectedHash,
    },
    update: {
      contentHash: expectedHash,
      updatedAt: new Date(),
    },
  });

  return;
}

async function main() {
  try {
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
          .filter((w) => /^[a-zA-ZÀ-ÿœŒæÆ]+$/.test(w)),
      );

      // Update words only if needed
      console.log(`Checking words for ${dict.language}...`);
      await updateWords(words, dict.language);

      // Always check categories, but only update words-to-categories mapping if words changed
      console.log(`Checking categories for ${dict.language}...`);
      for (const category of dict.categories) {
        await updateCategory(category, dict.language, words);
      }

      // Remove categories that no longer exist in the definitions
      const validCategoryNames = getAllCategoryNames(dict.categories);
      await prisma.category.deleteMany({
        where: {
          language: dict.language,
          name: { notIn: validCategoryNames },
          parentId: null, // Only delete root categories, children will be cascade deleted
        },
      });
    }

    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to get all category names from the category tree
function getAllCategoryNames(categories: CategoryDefinition[]): string[] {
  const names: string[] = [];
  for (const category of categories) {
    names.push(category.name);
    if (category.subcategories) {
      names.push(...getAllCategoryNames(category.subcategories));
    }
  }
  return names;
}

main();
