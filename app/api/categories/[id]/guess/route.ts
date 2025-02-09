import { NextResponse } from "next/server";
import { getDailyNumber } from "@/lib/daily";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { word } = await request.json();

    // Handle special category IDs
    let categoryId: number;

    // Get the language from the request URL
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language") || "en";

    // Get all valid categories for the current language
    const validCategories = await prisma.category.findMany({
      where: {
        AND: [
          { language },
          { isParent: false },
          { active: true },
          { words: { some: {} } },
        ],
      },
      select: {
        id: true,
      },
    });

    if (validCategories.length === 0) {
      return NextResponse.json(
        { error: "No valid categories found for this language" },
        { status: 404 },
      );
    }

    // Handle special IDs
    if (id === "daily") {
      const dailyIndex = getDailyNumber("daily") % validCategories.length;
      categoryId = validCategories[dailyIndex].id;
    } else if (id === "hidden-daily") {
      const hiddenDailyIndex =
        getDailyNumber("hidden") % validCategories.length;
      categoryId = validCategories[hiddenDailyIndex].id;
    } else if (id === "random") {
      const randomIndex = Math.floor(Math.random() * validCategories.length);
      categoryId = validCategories[randomIndex].id;
    } else {
      categoryId = parseInt(id);
    }

    // Find the word in the category
    const result = await prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        isParent: true,
        words: {
          where: {
            AND: [{ normalized: word.toLowerCase() }],
          },
          select: {
            word: true,
          },
          orderBy: {
            normalized: "asc",
          },
        },
      },
    });

    if (!result || !result.words.length) {
      return NextResponse.json({ found: false });
    }

    // Make sure we don't serve parent categories
    if (result.isParent) {
      return NextResponse.json(
        { error: "Invalid category type" },
        { status: 400 },
      );
    }

    // Get all words to find the index
    const allWords = await prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        words: {
          orderBy: {
            normalized: "asc",
          },
          select: {
            word: true,
          },
        },
      },
    });

    if (!allWords) {
      return NextResponse.json({ found: false });
    }

    const index = allWords.words.findIndex(
      (w) => w.word.toLowerCase() === result.words[0].word.toLowerCase(),
    );

    return NextResponse.json({
      found: true,
      index,
      displayWord: result.words[0].word,
    });
  } catch (error) {
    console.error("Failed to verify guess:", error);
    return NextResponse.json(
      { error: "Failed to verify guess" },
      { status: 500 },
    );
  }
}
