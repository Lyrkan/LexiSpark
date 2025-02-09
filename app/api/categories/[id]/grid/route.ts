import { NextResponse } from "next/server";
import { getDailyNumber } from "@/lib/daily";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Handle special category IDs
    let categoryId: number;
    let isHiddenDaily = false;

    // Get the language from the request URL
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language") || "en";

    // Get all valid categories for special IDs handling
    const getValidCategoriesForLanguage = async (lang: string) => {
      return prisma.category.findMany({
        where: {
          AND: [
            { language: lang },
            { isParent: false },
            { active: true },
            { words: { some: {} } },
          ],
        },
        select: {
          id: true,
        },
      });
    };

    // Handle special IDs
    if (id === "daily" || id === "hidden-daily" || id === "random") {
      const validCategories = await getValidCategoriesForLanguage(language);

      if (validCategories.length === 0) {
        return NextResponse.json(
          { error: "No valid categories found for this language" },
          { status: 404 },
        );
      }

      if (id === "daily") {
        const dailyNumber = getDailyNumber("daily");
        const dailyIndex = dailyNumber % validCategories.length;
        const selectedCategory = validCategories[dailyIndex];
        if (!selectedCategory) {
          console.error(
            `Invalid daily index: ${dailyIndex} for length ${validCategories.length}`,
          );
          return NextResponse.json(
            { error: "Failed to select valid category" },
            { status: 500 },
          );
        }
        categoryId = selectedCategory.id;
      } else if (id === "hidden-daily") {
        const hiddenNumber = getDailyNumber("hidden");
        const hiddenDailyIndex = hiddenNumber % validCategories.length;
        const selectedCategory = validCategories[hiddenDailyIndex];
        if (!selectedCategory) {
          console.error(
            `Invalid hidden-daily index: ${hiddenDailyIndex} for length ${validCategories.length}`,
          );
          return NextResponse.json(
            { error: "Failed to select valid category" },
            { status: 500 },
          );
        }
        categoryId = selectedCategory.id;
        isHiddenDaily = true;
      } else {
        // Random category
        const randomIndex = Math.floor(Math.random() * validCategories.length);
        const selectedCategory = validCategories[randomIndex];
        if (!selectedCategory) {
          console.error(
            `Invalid random index: ${randomIndex} for length ${validCategories.length}`,
          );
          return NextResponse.json(
            { error: "Failed to select valid category" },
            { status: 500 },
          );
        }
        categoryId = selectedCategory.id;
      }
    } else {
      categoryId = parseInt(id);
      if (isNaN(categoryId)) {
        return NextResponse.json(
          { error: "Invalid category ID format" },
          { status: 400 },
        );
      }
    }

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        active: true,
        isParent: false,
        words: { some: {} },
      },
      select: {
        id: true,
        name: true,
        isParent: true,
        words: {
          select: {
            length: true,
          },
          orderBy: {
            normalized: "asc",
          },
        },
        bloomFilter: true,
      },
    });

    if (!category) {
      console.error(
        `Category not found or no longer valid. ID: ${categoryId}, Special ID: ${id}`,
      );
      return NextResponse.json(
        { error: "Category not found or no longer valid" },
        { status: 404 },
      );
    }

    // Make sure we don't serve parent categories
    if (category.isParent) {
      return NextResponse.json(
        { error: "Invalid category type" },
        { status: 400 },
      );
    }

    // Return only the lengths of words and the bloom filter
    return NextResponse.json({
      wordLengths: category.words.map((w) => w.length),
      bloomFilter: Buffer.from(
        category.bloomFilter || new Uint8Array(),
      ).toString("base64"),
      categoryName: isHiddenDaily ? "Hidden Daily Challenge" : category.name,
      ...(isHiddenDaily ? {} : { categoryId: category.id }),
    });
  } catch (error) {
    console.error("Failed to fetch grid information:", error);
    // More detailed error information
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
    });

    return NextResponse.json(
      { error: "Failed to fetch grid information", details: errorMessage },
      { status: 500 },
    );
  }
}
