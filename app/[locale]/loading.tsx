"use client";

import { useTranslations } from "next-intl";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Loading() {
  const t = useTranslations();
  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center">
      <LoadingSpinner message={t("app.loading")} />
    </div>
  );
}
