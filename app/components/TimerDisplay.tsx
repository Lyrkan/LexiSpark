import { memo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface TimerDisplayProps {
  startTime: number;
  endTime: number | null;
  wordLengths: number[];
  guessedWords: (string | null)[];
}

const TimerDisplay = memo(
  ({ startTime, endTime, wordLengths, guessedWords }: TimerDisplayProps) => {
    const t = useTranslations();
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
      if (endTime) return;

      const intervalId = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);

      return () => clearInterval(intervalId);
    }, [endTime]);

    const elapsedSeconds = Math.max(
      0,
      Math.floor(((endTime || currentTime) - startTime) / 1000),
    );

    const formatElapsedTime = (seconds: number) => {
      if (seconds < 60) {
        return `${seconds}s`;
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
      } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
      }
    };

    return (
      <div className="flex flex-col items-end sm:gap-1 gap-0 min-w-[4.5rem] md:min-w-[8rem]">
        <div className="sm:text-xl text-lg font-bold whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
          {formatElapsedTime(elapsedSeconds)}
        </div>
        <div className="sm:text-sm text-sm text-gray-600 whitespace-nowrap font-medium">
          <span className="md:inline hidden">
            {t("game.wordsRemaining", {
              count:
                wordLengths.length -
                guessedWords.filter((w) => w !== null).length,
            })}
          </span>
          <span className="md:hidden inline">
            {guessedWords.filter((w) => w !== null).length}/{wordLengths.length}
          </span>
        </div>
      </div>
    );
  },
);
TimerDisplay.displayName = "TimerDisplay";

export default TimerDisplay;
