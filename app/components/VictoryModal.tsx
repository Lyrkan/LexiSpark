import { memo } from "react";
import { useTranslations } from "next-intl";

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

export default VictoryModal;
