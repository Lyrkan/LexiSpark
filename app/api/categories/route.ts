import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatInTimeZone, getTimezoneOffset } from "date-fns-tz";
import { getTranslations } from "next-intl/server";

// Helper to get the next midnight in Paris time
function getNextMidnightParis(): Date {
  const now = new Date();
  const parisDate = new Date(
    now.getTime() + getTimezoneOffset("Europe/Paris", now),
  );
  const nextMidnight = new Date(
    parisDate.getFullYear(),
    parisDate.getMonth(),
    parisDate.getDate() + 1,
  );
  // Format the date in Paris timezone to ensure we get midnight Paris time
  const nextMidnightStr = formatInTimeZone(
    nextMidnight,
    "Europe/Paris",
    "yyyy-MM-dd'T'00:00:00.000XXX",
  );
  return new Date(nextMidnightStr);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language");

    if (!language) {
      return NextResponse.json(
        { error: "Missing language parameter" },
        { status: 400 },
      );
    }

    // Get translations for the current language
    const t = await getTranslations({ locale: language });

    // Get root categories (those that are parents)
    const categories = await prisma.category.findMany({
      where: {
        language,
        active: true,
        isParent: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isParent: true,
        children: {
          where: {
            active: true,
          },
          select: {
            id: true,
            name: true,
            description: true,
            isParent: true,
            _count: {
              select: {
                words: true,
              },
            },
          },
        },
        _count: {
          select: {
            words: true,
          },
        },
      },
    });

    // Add expiration time for daily challenges
    const expiresAt = getNextMidnightParis().toISOString();

    // Create special categories with translations
    const specialCategories = [
      {
        name: t("specialCategories.daily.name"),
        description: t("specialCategories.daily.description"),
        isSpecial: true,
        specialId: "daily",
        language,
        expiresAt,
      },
      {
        name: t("specialCategories.hiddenDaily.name"),
        description: t("specialCategories.hiddenDaily.description"),
        isSpecial: true,
        specialId: "hidden-daily",
        language,
        expiresAt,
      },
      {
        name: t("specialCategories.random.name"),
        description: t("specialCategories.random.description"),
        isSpecial: true,
        specialId: "random",
        language,
      },
    ];

    return NextResponse.json([
      ...specialCategories,
      ...categories.map((category) => ({
        ...category,
        children: category.children?.map((child) => ({
          ...child,
          language,
        })),
        language,
      })),
    ]);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("Failed to fetch categories:", {
      message: errorMessage,
      stack: errorStack,
    });

    return NextResponse.json(
      { error: "Failed to fetch categories", details: errorMessage },
      { status: 500 },
    );
  }
}
