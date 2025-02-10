"use client";

import { useEffect, useState, useRef, useMemo, memo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { normalizeText } from "@/lib/textUtils";
import {
  deserializeBloomFilter,
  checkWord,
  SerializedBloomFilter,
} from "@/lib/bloomFilter";
import LoadingSpinner from "@/app/components/LoadingSpinner";

interface GameState {
  wordLengths: number[];
  bloomFilter: Uint8Array;
  guessedWords: (string | null)[];
  startTime: number;
  endTime: number | null;
  categoryName: string;
  categoryId?: number;
  lastGuessedIndex?: number;
}

interface VictoryModalProps {
  categoryName: string;
  wordCount: number;
  timeTaken: number;
  onBackToMenu: () => void;
}

const VictoryModal = memo(
  ({ categoryName, wordCount, timeTaken, onBackToMenu }: VictoryModalProps) => {
    const t = useTranslations();
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-900/90 via-purple-900/90 to-pink-900/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-10 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
          <div className="text-center mb-10">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
              {t("victory.title")}
            </h2>
            <p className="text-xl text-gray-700">
              {categoryName === "Hidden Daily Challenge" ? (
                <>
                  {t("victory.completedHiddenDaily.title")}
                  <br />
                  <span className="text-lg text-gray-500">
                    {t("victory.completedHiddenDaily.subtitle")}
                  </span>
                </>
              ) : (
                <>
                  {t("victory.completedCategory", { category: categoryName })}
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-2xl text-center transform hover:scale-105 transition-transform">
              <div className="text-4xl font-black text-indigo-700 mb-1">
                {wordCount}
              </div>
              <div className="text-indigo-600 font-medium">
                {t("game.wordsFound")}
              </div>
            </div>
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-2xl text-center transform hover:scale-105 transition-transform">
              <div className="text-4xl font-black text-pink-700 mb-1">
                {Math.floor(timeTaken / 1000)}s
              </div>
              <div className="text-pink-600 font-medium">{t("game.time")}</div>
            </div>
          </div>

          <button
            onClick={onBackToMenu}
            className="w-full px-8 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-2xl hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 font-medium shadow-xl"
          >
            {t("navigation.backToMenu")}
          </button>
        </div>
      </div>
    );
  },
);
VictoryModal.displayName = "VictoryModal";

const WordGridItem = memo(
  ({
    length,
    word,
    isLastGuessed,
    ref,
  }: {
    length: number;
    word: string | null;
    isLastGuessed: boolean;
    ref: (el: HTMLDivElement | null) => void;
  }) => (
    <div
      ref={ref}
      className={`p-2 sm:p-4 rounded-xl shadow-lg transition-all duration-300 transform h-10 sm:h-14 flex items-center justify-center ${
        isLastGuessed
          ? "animate-guessed-word bg-gradient-to-r from-emerald-100 to-teal-100"
          : "bg-white/80 backdrop-blur-sm hover:shadow-xl hover:scale-102"
      }`}
      style={{
        minWidth: `${Math.max(length * 1.1 + 1.5, 2.5)}rem`,
      }}
    >
      {word ? (
        <span
          className="sm:text-lg text-base font-medium text-emerald-700 font-mono"
          style={{
            letterSpacing: "0.25rem",
            display: "inline-block",
            textAlign: "center",
            fontFamily: "var(--font-geist-mono)",
          }}
        >
          {word}
        </span>
      ) : (
        <div
          style={{
            width: `${length * 1.1 - 0.2}rem`,
            height: "0.8rem",
            backgroundImage: `repeating-linear-gradient(to right, #d1d5db, #d1d5db 0.8rem, transparent 0.8rem, transparent 1.1rem)`,
            backgroundSize: `1.1rem 2px`,
            backgroundPosition: `0 100%`,
            backgroundRepeat: "repeat-x",
          }}
        />
      )}
    </div>
  ),
);
WordGridItem.displayName = "WordGridItem";

export default function GameClient({ id }: { id: string }) {
  const router = useRouter();
  const params = useParams();
  const currentLocale = params.locale as string;
  const t = useTranslations();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const wordRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollToIndexRef = useRef<number | null>(null);
  const deserializedBloomFilterRef = useRef<SerializedBloomFilter | null>(null);
  const normalizedGuessedWordsRef = useRef<Set<string>>(new Set());

  const normalizedCurrentGuess = useMemo(
    () => (currentGuess ? normalizeText(currentGuess) : ""),
    [currentGuess],
  );

  useEffect(() => {
    if (scrollToIndexRef.current !== null) {
      const element = wordRefs.current[scrollToIndexRef.current];
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      scrollToIndexRef.current = null;
    }
  });

  useEffect(() => {
    const guessedWordsSet = normalizedGuessedWordsRef.current;

    fetch(`/api/categories/${id}/grid?language=${currentLocale}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }

        const bloomFilter = new Uint8Array(
          Buffer.from(data.bloomFilter, "base64"),
        );
        deserializedBloomFilterRef.current =
          deserializeBloomFilter(bloomFilter);

        setGameState({
          wordLengths: data.wordLengths,
          bloomFilter,
          guessedWords: new Array(data.wordLengths.length).fill(null),
          startTime: Date.now(),
          endTime: null,
          categoryName: data.categoryName,
          categoryId: data.categoryId,
        });
        setCurrentTime(Date.now());
      })
      .catch(() => {
        setError(t("app.error.failedToLoadGame"));
      });

    return () => {
      deserializedBloomFilterRef.current = null;
      guessedWordsSet.clear();
    };
  }, [id, t, currentLocale]);

  const handleGuess = useMemo(
    () => async (normalizedGuess: string) => {
      if (!gameState || gameState.endTime) return;

      const guessedWordsSet = normalizedGuessedWordsRef.current;
      if (guessedWordsSet.has(normalizedGuess)) return;

      // First check with bloom filter
      if (
        !deserializedBloomFilterRef.current ||
        !checkWord(deserializedBloomFilterRef.current, normalizedGuess)
      ) {
        return;
      }

      // Then validate with the API
      try {
        const response = await fetch(
          `/api/categories/${id}/guess?language=${currentLocale}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ word: normalizedGuess }),
          },
        );

        const data = await response.json();
        if (!data.found || data.index === undefined) return;

        // Check if the word length matches the expected length at this index
        if (
          data.index >= gameState.wordLengths.length ||
          gameState.wordLengths[data.index] !== normalizedGuess.length ||
          gameState.guessedWords[data.index] !== null
        ) {
          return;
        }

        guessedWordsSet.add(normalizedGuess);
        const newGuessedWords = [...gameState.guessedWords];
        newGuessedWords[data.index] = data.displayWord || normalizedGuess;
        scrollToIndexRef.current = data.index;

        const allWordsGuessed = newGuessedWords.every((w) => w !== null);
        setGameState({
          ...gameState,
          guessedWords: newGuessedWords,
          lastGuessedIndex: data.index,
          endTime: allWordsGuessed ? Date.now() : null,
        });
        setCurrentGuess("");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const errorStack = error instanceof Error ? error.stack : undefined;

        console.error("Failed to verify word:", {
          message: errorMessage,
          stack: errorStack,
        });
      }
    },
    [gameState, id, currentLocale],
  );

  useEffect(() => {
    if (
      normalizedCurrentGuess &&
      gameState &&
      deserializedBloomFilterRef.current &&
      checkWord(deserializedBloomFilterRef.current, normalizedCurrentGuess)
    ) {
      handleGuess(normalizedCurrentGuess).catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const errorStack = error instanceof Error ? error.stack : undefined;

        console.error("Failed to handle guess:", {
          message: errorMessage,
          stack: errorStack,
        });
      });
    }
  }, [normalizedCurrentGuess, gameState, handleGuess]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        gameState?.endTime ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Backspace") {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (e.key.length === 1) {
        const normalized = normalizeText(e.key);
        if (normalized) {
          setCurrentGuess((prev) => prev + normalized);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameState?.endTime]);

  // Update timer every second
  useEffect(() => {
    if (!gameState || gameState.endTime) return;

    // Update time display every second
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameState]);

  // Memoize the word grid to prevent unnecessary re-renders
  const wordGrid = useMemo(
    () => (
      <div className="mb-8 sm:flex sm:flex-wrap sm:content-start sm:justify-between sm:gap-4 grid grid-cols-2 gap-4">
        {gameState?.wordLengths.map((length, index) => (
          <WordGridItem
            key={index}
            length={length}
            word={gameState.guessedWords[index]}
            isLastGuessed={gameState.lastGuessedIndex === index}
            ref={(el) => {
              if (el) wordRefs.current[index] = el;
            }}
          />
        ))}
      </div>
    ),
    [
      gameState?.wordLengths,
      gameState?.guessedWords,
      gameState?.lastGuessedIndex,
    ],
  );

  const timerDisplay = useMemo(() => {
    if (!gameState) return null;

    return (
      <div className="flex flex-col items-end sm:gap-1 gap-0 min-w-[4.5rem] md:min-w-[8rem]">
        <div className="sm:text-xl text-lg font-bold whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
          {Math.floor(
            ((gameState.endTime || currentTime) - gameState.startTime) / 1000,
          )}
          s
        </div>
        <div className="sm:text-sm text-sm text-gray-600 whitespace-nowrap font-medium">
          <span className="md:inline hidden">
            {t("game.wordsRemaining", {
              count:
                gameState.wordLengths.length -
                gameState.guessedWords.filter((w) => w !== null).length,
            })}
          </span>
          <span className="md:hidden inline">
            {gameState.guessedWords.filter((w) => w !== null).length}/
            {gameState.wordLengths.length}
          </span>
        </div>
      </div>
    );
  }, [gameState, currentTime, t]);

  if (error) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-xl text-red-500">{error}</div>
      </main>
    );
  }

  if (!gameState) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <LoadingSpinner message={t("app.loadingGame")} />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 pb-32 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-100 animate-gradient-slow">
      {gameState.endTime && (
        <VictoryModal
          categoryName={gameState.categoryName || "Unknown Category"}
          wordCount={gameState.guessedWords.filter((w) => w !== null).length}
          timeTaken={gameState.endTime - gameState.startTime}
          onBackToMenu={() => router.push("/")}
        />
      )}

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
          {gameState.categoryName === "Hidden Daily Challenge" ? (
            <>
              {t("game.hiddenDaily.title")}
              <div className="text-lg font-normal text-gray-600 mt-2">
                {t("game.hiddenDaily.subtitle")}
              </div>
            </>
          ) : (
            gameState.categoryName
          )}
        </h1>
        {wordGrid}
      </div>

      <div className="fixed bottom-0 left-0 right-0 sm:p-8 px-4 py-2 border-t border-white/20 shadow-2xl backdrop-blur-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center sm:gap-8 gap-2">
            <button
              onClick={() => router.push("/")}
              className="sm:px-4 px-4 sm:py-3 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-2xl hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 font-medium shadow-xl flex items-center justify-center min-w-[4.5rem] md:min-w-[8rem]"
            >
              <span className="md:inline hidden">
                {t("navigation.backToMenu")}
              </span>
              <span className="md:hidden inline text-2xl">←</span>
            </button>

            <div className="flex-1">
              <input
                type="text"
                value={currentGuess}
                onChange={(e) => setCurrentGuess(normalizeText(e.target.value))}
                className="w-full sm:p-4 p-3 sm:text-xl text-xl text-center border-2 rounded-2xl border-gray-200 bg-white/90 backdrop-blur-sm focus:border-indigo-400 focus:ring focus:ring-indigo-100 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                placeholder={t("game.typeYourGuess")}
                disabled={gameState.endTime !== null}
              />
            </div>

            {timerDisplay}
          </div>
        </div>
      </div>
    </main>
  );
}
