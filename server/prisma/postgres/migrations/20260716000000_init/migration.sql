-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "player_details" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "lastMatchPlayedMinutes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "player_details_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "player_tracking" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isTracking" BOOLEAN NOT NULL DEFAULT true,
    "positionOverride" TEXT,
    "latestDetailsId" INTEGER,
    CONSTRAINT "player_tracking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "player_training_week" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "positionCode" INTEGER,
    "playedMinutes" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "player_training_week_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "team_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "trainingTypeId" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "team_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "player_change" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "key" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    CONSTRAINT "player_change_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "market_study" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "searchParams" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "market_study_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_chart" (
    "id" SERIAL NOT NULL,
    "marketStudyId" INTEGER NOT NULL,
    "groupBy" TEXT NOT NULL,
    "filters" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_chart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transfer_player" (
    "id" SERIAL NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "transfer_player_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "price_model" (
    "id" SERIAL NOT NULL,
    "coefficients" TEXT NOT NULL,
    "featureNames" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "trainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_model_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "player_details_playerId_fetchedAt_idx" ON "player_details"("playerId", "fetchedAt");
CREATE UNIQUE INDEX "player_tracking_playerId_key" ON "player_tracking"("playerId");
CREATE UNIQUE INDEX "player_tracking_latestDetailsId_key" ON "player_tracking"("latestDetailsId");
CREATE INDEX "player_training_week_playerId_idx" ON "player_training_week"("playerId");
CREATE UNIQUE INDEX "player_training_week_playerId_weekStart_key" ON "player_training_week"("playerId", "weekStart");
CREATE INDEX "player_change_playerId_detectedAt_idx" ON "player_change"("playerId", "detectedAt");
CREATE INDEX "custom_chart_marketStudyId_idx" ON "custom_chart"("marketStudyId");
CREATE INDEX "transfer_player_playerId_idx" ON "transfer_player"("playerId");
CREATE INDEX "transfer_player_marketStudyId_idx" ON "transfer_player"("marketStudyId");

ALTER TABLE "player_tracking" ADD CONSTRAINT "player_tracking_latestDetailsId_fkey"
  FOREIGN KEY ("latestDetailsId") REFERENCES "player_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_chart" ADD CONSTRAINT "custom_chart_marketStudyId_fkey"
  FOREIGN KEY ("marketStudyId") REFERENCES "market_study"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transfer_player" ADD CONSTRAINT "transfer_player_playerDetailsId_fkey"
  FOREIGN KEY ("playerDetailsId") REFERENCES "player_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transfer_player" ADD CONSTRAINT "transfer_player_marketStudyId_fkey"
  FOREIGN KEY ("marketStudyId") REFERENCES "market_study"("id") ON DELETE SET NULL ON UPDATE CASCADE;
