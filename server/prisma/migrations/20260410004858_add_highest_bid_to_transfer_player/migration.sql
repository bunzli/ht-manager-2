-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_transfer_player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "marketStudyId" INTEGER,
    "playerDetailsId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'listed',
    "askingPrice" INTEGER NOT NULL DEFAULT 0,
    "highestBid" INTEGER NOT NULL DEFAULT 0,
    "finalPrice" INTEGER,
    "deadline" TEXT NOT NULL DEFAULT '',
    "buyerTeamId" INTEGER,
    "buyerTeamName" TEXT,
    "sellerTeamId" INTEGER,
    "sellerTeamName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transfer_player_playerDetailsId_fkey" FOREIGN KEY ("playerDetailsId") REFERENCES "player_details" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transfer_player_marketStudyId_fkey" FOREIGN KEY ("marketStudyId") REFERENCES "market_study" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_transfer_player" ("askingPrice", "buyerTeamId", "buyerTeamName", "createdAt", "deadline", "finalPrice", "id", "marketStudyId", "playerDetailsId", "playerId", "sellerTeamId", "sellerTeamName", "status", "updatedAt") SELECT "askingPrice", "buyerTeamId", "buyerTeamName", "createdAt", "deadline", "finalPrice", "id", "marketStudyId", "playerDetailsId", "playerId", "sellerTeamId", "sellerTeamName", "status", "updatedAt" FROM "transfer_player";
DROP TABLE "transfer_player";
ALTER TABLE "new_transfer_player" RENAME TO "transfer_player";
CREATE INDEX "transfer_player_playerId_idx" ON "transfer_player"("playerId");
CREATE INDEX "transfer_player_marketStudyId_idx" ON "transfer_player"("marketStudyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
