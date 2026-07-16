-- CreateTable
CREATE TABLE "team_match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "matchDate" DATETIME NOT NULL,
    "matchType" INTEGER NOT NULL,
    "homeTeamId" INTEGER NOT NULL,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "homeGoals" INTEGER,
    "awayGoals" INTEGER,
    "lineupFetchedAt" DATETIME
);

-- CreateTable
CREATE TABLE "player_match_appearance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "teamMatchId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "positionCode" INTEGER,
    "behaviour" INTEGER,
    "ratingStars" REAL,
    CONSTRAINT "player_match_appearance_teamMatchId_fkey" FOREIGN KEY ("teamMatchId") REFERENCES "team_match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "team_match_matchId_key" ON "team_match"("matchId");
CREATE INDEX "team_match_matchDate_idx" ON "team_match"("matchDate");
CREATE INDEX "player_match_appearance_playerId_idx" ON "player_match_appearance"("playerId");
CREATE INDEX "player_match_appearance_teamMatchId_idx" ON "player_match_appearance"("teamMatchId");
CREATE UNIQUE INDEX "player_match_appearance_playerId_teamMatchId_key" ON "player_match_appearance"("playerId", "teamMatchId");
