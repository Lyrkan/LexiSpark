import { memo } from "react";

interface WordGridItemProps {
  length: number;
  word: string | null;
  isLastGuessed: boolean;
  ref: (el: HTMLDivElement | null) => void;
}

const WordGridItem = memo(
  ({ length, word, isLastGuessed, ref }: WordGridItemProps) => (
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

export default WordGridItem;
