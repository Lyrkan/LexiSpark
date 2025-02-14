"use client";

import { memo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { formatDistanceStrict } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useParams } from "next/navigation";

interface CountdownTimerProps {
  expiresAt: string;
}

const LOCALES = {
  en: enUS,
  fr: fr,
};

const CountdownTimer = memo(({ expiresAt }: CountdownTimerProps) => {
  const t = useTranslations();
  const params = useParams();
  const currentLocale = params.locale as string;
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(expiresAt);

      if (target <= now) {
        setTimeLeft(null);
        return;
      }

      const diffInMinutes = Math.floor(
        (target.getTime() - now.getTime()) / (1000 * 60),
      );
      const unit = diffInMinutes >= 60 ? "hour" : "minute";

      setTimeLeft(
        formatDistanceStrict(now, target, {
          locale: LOCALES[currentLocale as keyof typeof LOCALES] || enUS,
          unit,
          roundingMethod: "floor",
        }),
      );
    };

    // Calculate immediately
    calculateTimeLeft();

    // Then update every minute
    const intervalId = setInterval(calculateTimeLeft, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [expiresAt, currentLocale]);

  if (!timeLeft) return null;

  return (
    <div className="text-sm font-medium mt-2">
      {t.rich("game.timeLeft", {
        timeLeft,
        strong: (chunks) => <strong>{chunks}</strong>,
      })}
    </div>
  );
});

CountdownTimer.displayName = "CountdownTimer";

export default CountdownTimer;
