-- CreateTable
CREATE TABLE "player_details" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstName" TEXT NOT NULL,
    "nickName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL,
    "playerNumber" INTEGER NOT NULL DEFAULT 0,
    "age" INTEGER NOT NULL,
    "ageDays" INTEGER NOT NULL,
    "genderId" INTEGER NOT NULL DEFAULT 1,
    "arrivalDate" TEXT NOT NULL DEFAULT '',
    "tsi" INTEGER NOT NULL,
    "playerForm" INTEGER NOT NULL,
    "experience" INTEGER NOT NULL,
    "loyalty" INTEGER NOT NULL,
    "motherClubBonus" BOOLEAN NOT NULL DEFAULT false,
    "leadership" INTEGER NOT NULL,
    "salary" INTEGER NOT NULL DEFAULT 0,
    "isAbroad" BOOLEAN NOT NULL DEFAULT false,
    "agreeability" INTEGER NOT NULL DEFAULT 0,
    "aggressiveness" INTEGER NOT NULL DEFAULT 0,
    "honesty" INTEGER NOT NULL DEFAULT 0,
    "specialty" INTEGER NOT NULL DEFAULT 0,
    "countryId" INTEGER NOT NULL DEFAULT 0,
    "nationalTeamId" INTEGER NOT NULL DEFAULT 0,
    "caps" INTEGER NOT NULL DEFAULT 0,
    "capsU20" INTEGER NOT NULL DEFAULT 0,
    "cards" INTEGER NOT NULL DEFAULT 0,
    "injuryLevel" INTEGER NOT NULL DEFAULT -1,
    "staminaSkill" INTEGER NOT NULL DEFAULT 0,
    "keeperSkill" INTEGER NOT NULL DEFAULT 0,
    "playmakerSkill" INTEGER NOT NULL DEFAULT 0,
    "scorerSkill" INTEGER NOT NULL DEFAULT 0,
    "passingSkill" INTEGER NOT NULL DEFAULT 0,
    "wingerSkill" INTEGER NOT NULL DEFAULT 0,
    "defenderSkill" INTEGER NOT NULL DEFAULT 0,
    "setPiecesSkill" INTEGER NOT NULL DEFAULT 0,
    "leagueGoals" INTEGER NOT NULL DEFAULT 0,
    "cupGoals" INTEGER NOT NULL DEFAULT 0,
    "friendliesGoals" INTEGER NOT NULL DEFAULT 0,
    "careerGoals" INTEGER NOT NULL DEFAULT 0,
    "careerHattricks" INTEGER NOT NULL DEFAULT 0,
    "matchesCurrentTeam" INTEGER NOT NULL DEFAULT 0,
    "goalsCurrentTeam" INTEGER NOT NULL DEFAULT 0,
    "assistsCurrentTeam" INTEGER NOT NULL DEFAULT 0,
    "careerAssists" INTEGER NOT NULL DEFAULT 0,
    "playerCategoryId" INTEGER NOT NULL DEFAULT 0,
    "transferListed" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "player_tracking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isTracking" BOOLEAN NOT NULL DEFAULT true,
    "latestDetailsId" INTEGER,
    CONSTRAINT "player_tracking_latestDetailsId_fkey" FOREIGN KEY ("latestDetailsId") REFERENCES "player_details" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "player_change" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "key" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "market_study" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "searchParams" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "transfer_player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "marketStudyId" INTEGER,
    "playerDetailsId" INTEGER NOT NULL,
    "askingPrice" INTEGER NOT NULL DEFAULT 0,
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

-- CreateIndex
CREATE INDEX "player_details_playerId_fetchedAt_idx" ON "player_details"("playerId", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "player_tracking_playerId_key" ON "player_tracking"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_tracking_latestDetailsId_key" ON "player_tracking"("latestDetailsId");

-- CreateIndex
CREATE INDEX "player_change_playerId_detectedAt_idx" ON "player_change"("playerId", "detectedAt");

-- CreateIndex
CREATE INDEX "transfer_player_playerId_idx" ON "transfer_player"("playerId");

-- CreateIndex
CREATE INDEX "transfer_player_marketStudyId_idx" ON "transfer_player"("marketStudyId");
