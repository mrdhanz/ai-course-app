/*
  Warnings:

  - You are about to drop the column `instructor` on the `Course` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "difficultyLevel" TEXT NOT NULL,
    "verifiedBy" TEXT NOT NULL,
    "totalDuration" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Course" ("createdAt", "description", "difficultyLevel", "id", "language", "title", "totalDuration", "updatedAt", "verifiedBy") SELECT "createdAt", "description", "difficultyLevel", "id", "language", "title", "totalDuration", "updatedAt", "verifiedBy" FROM "Course";
DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
