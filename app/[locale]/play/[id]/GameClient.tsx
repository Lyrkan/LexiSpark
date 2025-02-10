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
import VictoryModal from "@/app/components/VictoryModal";
import WordGridItem from "@/app/components/WordGridItem";
import TimerDisplay from "@/app/components/TimerDisplay";

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

export default function GameClient({ id }: { id: string }) {
  const router = useRouter();
  const params = useParams();
  const currentLocale = params.locale as string;
  const t = useTranslations();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [error, setError] = useState<string | null>(null);
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

            <TimerDisplay
              startTime={gameState.startTime}
              endTime={gameState.endTime}
              wordLengths={gameState.wordLengths}
              guessedWords={gameState.guessedWords}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
