import { Suspense } from "react";
import GameClient from "./GameClient";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { getTranslations } from "next-intl/server";

export default async function GamePage(props: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations();
  const { id } = await props.params;

  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-8 flex items-center justify-center">
          <LoadingSpinner message={t("app.loadingGame")} />
        </main>
      }
    >
      <GameClient id={id} />
    </Suspense>
  );
}
