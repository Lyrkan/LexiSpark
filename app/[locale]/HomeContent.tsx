"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useRouter,
  useSearchParams,
  usePathname,
  useParams,
} from "next/navigation";
import { useTranslations } from "next-intl";
import { getGameProgress } from "@/lib/storage";
import { GB as GBFlag, FR as FRFlag } from "country-flag-icons/react/3x2";
import {
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  FolderIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import CountdownTimer from "@/app/components/CountdownTimer";

interface Category {
  id?: number;
  name: string;
  description: string;
  language?: string;
  rules?: {
    type: string;
    params: {
      letter?: string;
      length?: number;
      words?: string[];
    };
  };
  subcategories?: Category[];
  isParent?: boolean;
  children?: Category[];
  isSpecial?: boolean;
  isHiddenDaily?: boolean;
  specialId?: string;
  _count?: {
    words: number;
  };
  expiresAt?: string;
}

const AVAILABLE_LANGUAGES = [
  { code: "en", name: "English", Flag: GBFlag },
  { code: "fr", name: "Français", Flag: FRFlag },
];

function CategoryCard({
  category,
  onClick,
  allCategories,
  selectedLanguage,
}: {
  category: Category;
  onClick?: () => void;
  allCategories?: Category[];
  selectedLanguage: string;
}) {
  const [progress, setProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const t = useTranslations();

  useEffect(() => {
    // Don't try to load progress for parent categories or random challenges
    if (category.isParent || category.specialId === "random") {
      return;
    }

    // For special categories (daily/hidden-daily), we need to get the actual category ID
    let categoryId = category.id?.toString();
    if (
      category.specialId === "daily" ||
      category.specialId === "hidden-daily"
    ) {
      categoryId = category.specialId;
    }

    if (categoryId) {
      const savedProgress = getGameProgress(categoryId);
      if (savedProgress) {
        setProgress({
          completed: savedProgress.completedWords,
          total: savedProgress.totalWords,
        });
      }
    }
  }, [category]);

  const getIcon = () => {
    if (category.isSpecial) {
      switch (category.specialId) {
        case "daily":
          return <CalendarDaysIcon className="w-8 h-8" />;
        case "hidden-daily":
          return <QuestionMarkCircleIcon className="w-8 h-8" />;
        case "random":
          return <SparklesIcon className="w-8 h-8" />;
        default:
          return null;
      }
    }
    return category.isParent ? (
      <FolderIcon className="w-8 h-8" />
    ) : (
      <ChevronRightIcon className="w-8 h-8" />
    );
  };

  const renderProgress = () => {
    if (!progress || category.isParent) return null;

    const percentage = Math.round((progress.completed / progress.total) * 100);
    return (
      <div className="mt-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-600">
            {t("app.progress.wordsProgress", {
              completed: progress.completed,
              total: progress.total,
            })}
          </span>
          <span className="text-sm font-medium text-gray-600">
            {t("app.progress.percentage", { percentage })}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  if (category.isParent) {
    return (
      <button
        onClick={onClick}
        className="group block w-full text-left p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] hover:bg-gradient-to-br hover:from-white hover:to-indigo-50 border border-white/20"
      >
        <div className="flex items-center gap-4">
          <div className="text-gray-600 group-hover:text-indigo-700 transition-colors shrink-0">
            {getIcon()}
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-3 text-gray-800 group-hover:text-indigo-700 transition-colors">
              {category.name}
            </h2>
            <p className="text-gray-600">{category.description}</p>
          </div>
        </div>
      </button>
    );
  }

  // Get valid categories for special challenges
  const getAllValidCategories = (
    categories: Category[] | undefined,
  ): Category[] => {
    if (!categories) return [];
    return categories.flatMap((cat) => {
      if (cat.isParent) {
        return getAllValidCategories(cat.children || cat.subcategories);
      }

      if (
        !cat.isSpecial &&
        cat.id !== undefined &&
        cat.language === selectedLanguage
      ) {
        return [cat];
      }

      return [];
    });
  };

  const validCategories = getAllValidCategories(allCategories);

  let href = `/play/${category.id}`;

  // Handle special categories
  if (category.specialId === "random" && validCategories.length > 0) {
    const randomIndex = Math.floor(Math.random() * validCategories.length);
    const randomCategory = validCategories[randomIndex];
    href = `/play/${randomCategory.id}`;
  } else if (category.specialId && category.specialId !== "random") {
    href = `/play/${category.specialId}`;
  }

  const baseClasses =
    "group block w-full p-8 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] border border-white/20";
  const specialClasses = category.isSpecial
    ? "bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
    : "bg-white/80 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50";

  return (
    <Link href={href} className={`${baseClasses} ${specialClasses}`}>
      <div className="flex items-center gap-4">
        <div
          className={`${category.isSpecial ? "text-white" : "text-gray-600 group-hover:text-indigo-700 transition-colors"} shrink-0`}
        >
          {getIcon()}
        </div>
        <div className="flex-grow">
          <div className="flex items-center justify-between mb-3">
            <h2
              className={`text-2xl font-bold ${
                category.isSpecial
                  ? "text-white"
                  : "text-gray-800 group-hover:text-indigo-700"
              } transition-colors`}
            >
              {category.name}
            </h2>
            {!category.isSpecial && category._count && (
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  category.isSpecial
                    ? "bg-white/20 text-white"
                    : "bg-indigo-100 text-indigo-700"
                }`}
              >
                {t("app.wordCount", { count: category._count.words })}
              </span>
            )}
          </div>
          <p className={category.isSpecial ? "text-white/90" : "text-gray-600"}>
            {category.description}
          </p>
          {!category.isSpecial && renderProgress()}
          {category.specialId &&
            category.specialId !== "random" &&
            category.expiresAt && (
              <div
                className={
                  category.isSpecial ? "text-white/90" : "text-gray-600"
                }
              >
                <CountdownTimer expiresAt={category.expiresAt} />
              </div>
            )}
        </div>
      </div>
    </Link>
  );
}

function CategoriesSection({ selectedLanguage }: { selectedLanguage: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);
  const t = useTranslations();

  // Load categories when language changes
  useEffect(() => {
    const fetchCategories = async () => {
      setSelectedParent(null);
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/categories?language=${selectedLanguage}`);
        const data = await res.json();
        setCategories(data);
      } catch {
        setError(t("app.error.failedToLoad"));
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [selectedLanguage, t]);

  // Update selected parent when URL changes
  useEffect(() => {
    const categoryId = searchParams.get("category");
    if (categoryId) {
      const parent = categories.find((c) => c.id === parseInt(categoryId));
      if (parent) {
        setSelectedParent(parent);
      }
    } else {
      setSelectedParent(null);
    }
  }, [searchParams, categories]);

  const handleParentClick = (category: Category) => {
    router.push(`/?category=${category.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {selectedParent ? (
        <>
          <div className="mb-8">
            <button
              onClick={() => router.push("/")}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 font-medium transition-all px-4 py-2 rounded-xl hover:bg-white/50 hover:scale-105"
            >
              <span className="text-2xl">←</span>
              <span>{t("navigation.backToMenu")}</span>
            </button>
          </div>
          <div className="space-y-6">
            {(
              selectedParent.children ||
              selectedParent.subcategories ||
              []
            ).map((category, index) => (
              <CategoryCard
                key={index}
                category={category}
                allCategories={categories}
                selectedLanguage={selectedLanguage}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-12">
          {/* Special Categories */}
          <div className="space-y-6">
            {categories
              .filter((category) => category.isSpecial)
              .map((category, index) => (
                <CategoryCard
                  key={`special-${index}`}
                  category={category}
                  allCategories={categories}
                  selectedLanguage={selectedLanguage}
                />
              ))}
          </div>

          {/* Regular Categories */}
          <div className="space-y-6">
            {categories
              .filter((category) => !category.isSpecial)
              .map((category, index) => (
                <CategoryCard
                  key={`regular-${index}`}
                  category={category}
                  onClick={() => handleParentClick(category)}
                  allCategories={categories}
                  selectedLanguage={selectedLanguage}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomeContent() {
  const router = useRouter();
  const t = useTranslations();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params.locale as string;

  const handleLanguageChange = (locale: string) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete("category"); // Remove the category parameter when switching languages
    const newPath = `/${locale}${pathname.substring(3)}${currentParams.toString() ? `?${currentParams.toString()}` : ""}`;
    router.push(newPath);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="relative">
        <h1 className="text-6xl font-black mb-4 text-center">
          <span
            className="inline-block"
            style={{ fontFamily: "var(--font-righteous)" }}
          >
            <span className="text-indigo-800">LEXI</span>
            <span className="bg-gradient-to-r from-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
              SPARK
            </span>
          </span>
        </h1>
        <p className="text-center text-gray-600 mb-12 text-lg">
          {t("app.subtitle")}
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-12">
        <div className="flex justify-center gap-4">
          {AVAILABLE_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`px-8 py-4 rounded-2xl font-medium transition-all transform hover:scale-105 ${
                currentLocale === lang.code
                  ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl"
                  : "bg-white/80 backdrop-blur-sm hover:bg-white shadow-lg hover:shadow-xl text-gray-800"
              }`}
            >
              <span className="inline-block w-6 mr-2">
                <lang.Flag />
              </span>
              {lang.name}
            </button>
          ))}
        </div>
      </div>

      <CategoriesSection selectedLanguage={currentLocale} />
    </main>
  );
}
