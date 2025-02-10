-- AlterTable
ALTER TABLE "Category" ADD COLUMN "contentHash" TEXT;

-- CreateTable
CREATE TABLE "LanguageWordList" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "language" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "LanguageWordList_language_key" ON "LanguageWordList"("language");
