-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_player_details" (
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
    "transferListed" BOOLEAN NOT NULL DEFAULT false,
    "avatarBackground" TEXT NOT NULL DEFAULT '',
    "avatarLayers" TEXT NOT NULL DEFAULT '[]'
);
INSERT INTO "new_player_details" ("age", "ageDays", "aggressiveness", "agreeability", "arrivalDate", "assistsCurrentTeam", "caps", "capsU20", "cards", "careerAssists", "careerGoals", "careerHattricks", "countryId", "cupGoals", "defenderSkill", "experience", "fetchedAt", "firstName", "friendliesGoals", "genderId", "goalsCurrentTeam", "honesty", "id", "injuryLevel", "isAbroad", "keeperSkill", "lastName", "leadership", "leagueGoals", "loyalty", "matchesCurrentTeam", "motherClubBonus", "nationalTeamId", "nickName", "passingSkill", "playerCategoryId", "playerForm", "playerId", "playerNumber", "playmakerSkill", "salary", "scorerSkill", "setPiecesSkill", "specialty", "staminaSkill", "transferListed", "tsi", "wingerSkill") SELECT "age", "ageDays", "aggressiveness", "agreeability", "arrivalDate", "assistsCurrentTeam", "caps", "capsU20", "cards", "careerAssists", "careerGoals", "careerHattricks", "countryId", "cupGoals", "defenderSkill", "experience", "fetchedAt", "firstName", "friendliesGoals", "genderId", "goalsCurrentTeam", "honesty", "id", "injuryLevel", "isAbroad", "keeperSkill", "lastName", "leadership", "leagueGoals", "loyalty", "matchesCurrentTeam", "motherClubBonus", "nationalTeamId", "nickName", "passingSkill", "playerCategoryId", "playerForm", "playerId", "playerNumber", "playmakerSkill", "salary", "scorerSkill", "setPiecesSkill", "specialty", "staminaSkill", "transferListed", "tsi", "wingerSkill" FROM "player_details";
DROP TABLE "player_details";
ALTER TABLE "new_player_details" RENAME TO "player_details";
CREATE INDEX "player_details_playerId_fetchedAt_idx" ON "player_details"("playerId", "fetchedAt");
CREATE TABLE "new_transfer_player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "marketStudyId" INTEGER,
    "playerDetailsId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'listed',
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
INSERT INTO "new_transfer_player" ("askingPrice", "buyerTeamId", "buyerTeamName", "createdAt", "deadline", "finalPrice", "id", "marketStudyId", "playerDetailsId", "playerId", "sellerTeamId", "sellerTeamName", "updatedAt") SELECT "askingPrice", "buyerTeamId", "buyerTeamName", "createdAt", "deadline", "finalPrice", "id", "marketStudyId", "playerDetailsId", "playerId", "sellerTeamId", "sellerTeamName", "updatedAt" FROM "transfer_player";
DROP TABLE "transfer_player";
ALTER TABLE "new_transfer_player" RENAME TO "transfer_player";
CREATE INDEX "transfer_player_playerId_idx" ON "transfer_player"("playerId");
CREATE INDEX "transfer_player_marketStudyId_idx" ON "transfer_player"("marketStudyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
