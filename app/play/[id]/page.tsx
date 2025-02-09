import { Suspense } from "react";
import GameClient from "./GameClient";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-8 flex items-center justify-center">
          <div className="text-xl">Loading game...</div>
        </main>
      }
    >
      <GameClient id={id} />
    </Suspense>
  );
}
