-- CreateTable
CREATE TABLE "Word" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "word" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "length" INTEGER NOT NULL,
    "language" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "type" TEXT,
    "rules" TEXT,
    "bloomFilter" BLOB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isParent" BOOLEAN NOT NULL DEFAULT false,
    "parentId" INTEGER,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoryId" INTEGER NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "guesses" INTEGER NOT NULL DEFAULT 0,
    "mistakes" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "_CategoryToWord" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_CategoryToWord_A_fkey" FOREIGN KEY ("A") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CategoryToWord_B_fkey" FOREIGN KEY ("B") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Word_language_idx" ON "Word"("language");

-- CreateIndex
CREATE UNIQUE INDEX "Word_word_language_key" ON "Word"("word", "language");

-- CreateIndex
CREATE UNIQUE INDEX "Word_normalized_language_key" ON "Word"("normalized", "language");

-- CreateIndex
CREATE INDEX "Category_language_idx" ON "Category"("language");

-- CreateIndex
CREATE INDEX "Category_active_idx" ON "Category"("active");

-- CreateIndex
CREATE INDEX "Category_isParent_idx" ON "Category"("isParent");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_language_key" ON "Category"("name", "language");

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryToWord_AB_unique" ON "_CategoryToWord"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryToWord_B_index" ON "_CategoryToWord"("B");
