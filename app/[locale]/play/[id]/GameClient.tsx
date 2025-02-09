"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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

function VictoryModal({
  categoryName,
  wordCount,
  timeTaken,
  onBackToMenu,
}: VictoryModalProps) {
  const t = useTranslations();
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-10 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
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
              <>{t("victory.completedCategory", { category: categoryName })}</>
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
}

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

  // Memoize the normalized current guess
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
        console.error("Failed to verify word:", error);
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
        console.error("Failed to handle guess:", error);
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

  // Optimize timer updates using requestAnimationFrame
  useEffect(() => {
    if (!gameState || gameState.endTime) return;

    let animationFrameId: number;
    const updateTimer = () => {
      setCurrentTime(Date.now());
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    animationFrameId = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState]);

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
        <div className="mb-8 flex flex-wrap content-start justify-between gap-4">
          {gameState.wordLengths.map((length, index) => (
            <div
              key={index}
              ref={(el) => {
                if (el) wordRefs.current[index] = el;
              }}
              className={`p-4 rounded-xl shadow-lg transition-all duration-300 transform h-14 flex items-center justify-center ${
                gameState.lastGuessedIndex === index
                  ? "animate-bounce bg-gradient-to-r from-emerald-100 to-teal-100"
                  : "bg-white/80 backdrop-blur-sm hover:shadow-xl hover:scale-102"
              }`}
              style={{ minWidth: `${Math.max(length * 1.2 + 2, 3)}rem` }}
            >
              {gameState.guessedWords[index] ? (
                <span
                  className="text-lg font-medium text-emerald-700 font-mono"
                  style={{
                    letterSpacing: "0.3rem",
                    display: "inline-block",
                    textAlign: "center",
                    fontFamily: "var(--font-geist-mono)",
                  }}
                >
                  {gameState.guessedWords[index]}
                </span>
              ) : (
                <div
                  style={{
                    width: `${length * 1.3 - 0.3}rem`,
                    height: "1rem",
                    backgroundImage: `repeating-linear-gradient(to right, #d1d5db, #d1d5db 1rem, transparent 1rem, transparent 1.3rem)`,
                    backgroundSize: `1.3rem 2px`,
                    backgroundPosition: `0 100%`,
                    backgroundRepeat: "repeat-x",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 border-t border-white/20 shadow-2xl backdrop-blur-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-8">
            <button
              onClick={() => router.push("/")}
              className="px-8 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-2xl hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 font-medium shadow-xl"
            >
              {t("navigation.backToMenu")}
            </button>

            <div className="flex-1">
              <input
                type="text"
                value={currentGuess}
                onChange={(e) => setCurrentGuess(normalizeText(e.target.value))}
                className="w-full p-5 text-2xl text-center border-2 rounded-2xl border-gray-200 bg-white/90 backdrop-blur-sm focus:border-indigo-400 focus:ring focus:ring-indigo-100 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                placeholder={t("game.typeYourGuess")}
                disabled={gameState.endTime !== null}
              />
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="text-2xl font-bold whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                {t("game.time")}:{" "}
                {Math.floor(
                  ((gameState.endTime || currentTime) - gameState.startTime) /
                    1000,
                )}
                s
              </div>
              <div className="text-base text-gray-600 whitespace-nowrap font-medium">
                {t("game.wordsRemaining", {
                  count:
                    gameState.wordLengths.length -
                    gameState.guessedWords.filter((w) => w !== null).length,
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
