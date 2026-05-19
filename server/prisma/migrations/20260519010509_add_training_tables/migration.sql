-- CreateTable
CREATE TABLE "player_training_week" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "positionCode" INTEGER,
    "playedMinutes" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "team_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "trainingTypeId" INTEGER,
    "updatedAt" DATETIME NOT NULL
);

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
    "avatarLayers" TEXT NOT NULL DEFAULT '[]',
    "lastMatchDate" TEXT,
    "lastMatchPositionCode" INTEGER,
    "lastMatchPlayedMinutes" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_player_details" ("age", "ageDays", "aggressiveness", "agreeability", "arrivalDate", "assistsCurrentTeam", "avatarBackground", "avatarLayers", "caps", "capsU20", "cards", "careerAssists", "careerGoals", "careerHattricks", "countryId", "cupGoals", "defenderSkill", "experience", "fetchedAt", "firstName", "friendliesGoals", "genderId", "goalsCurrentTeam", "honesty", "id", "injuryLevel", "isAbroad", "keeperSkill", "lastName", "leadership", "leagueGoals", "loyalty", "matchesCurrentTeam", "motherClubBonus", "nationalTeamId", "nickName", "passingSkill", "playerCategoryId", "playerForm", "playerId", "playerNumber", "playmakerSkill", "salary", "scorerSkill", "setPiecesSkill", "specialty", "staminaSkill", "transferListed", "tsi", "wingerSkill") SELECT "age", "ageDays", "aggressiveness", "agreeability", "arrivalDate", "assistsCurrentTeam", "avatarBackground", "avatarLayers", "caps", "capsU20", "cards", "careerAssists", "careerGoals", "careerHattricks", "countryId", "cupGoals", "defenderSkill", "experience", "fetchedAt", "firstName", "friendliesGoals", "genderId", "goalsCurrentTeam", "honesty", "id", "injuryLevel", "isAbroad", "keeperSkill", "lastName", "leadership", "leagueGoals", "loyalty", "matchesCurrentTeam", "motherClubBonus", "nationalTeamId", "nickName", "passingSkill", "playerCategoryId", "playerForm", "playerId", "playerNumber", "playmakerSkill", "salary", "scorerSkill", "setPiecesSkill", "specialty", "staminaSkill", "transferListed", "tsi", "wingerSkill" FROM "player_details";
DROP TABLE "player_details";
ALTER TABLE "new_player_details" RENAME TO "player_details";
CREATE INDEX "player_details_playerId_fetchedAt_idx" ON "player_details"("playerId", "fetchedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "player_training_week_playerId_idx" ON "player_training_week"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_training_week_playerId_weekStart_key" ON "player_training_week"("playerId", "weekStart");
