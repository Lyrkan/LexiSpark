import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language") || "en";

    // Get root categories (those without parents)
    const categories = await prisma.category.findMany({
      where: {
        language,
        active: true,
        parentId: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        language: true,
        isParent: true,
        children: {
          where: {
            active: true,
          },
          select: {
            id: true,
            name: true,
            description: true,
            language: true,
            isParent: true,
            _count: {
              select: {
                words: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(categories);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
