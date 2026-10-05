-- CreateTable
CREATE TABLE "youth_academy" (
    "youthTeamId" INTEGER NOT NULL,
    "seniorTeamId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3),
    "matchesSyncedAt" TIMESTAMP(3),

    CONSTRAINT "youth_academy_pkey" PRIMARY KEY ("youthTeamId")
);

-- CreateTable
CREATE TABLE "youth_player" (
    "id" SERIAL NOT NULL,
    "youthPlayerId" INTEGER NOT NULL,
    "youthTeamId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "youth_player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youth_snapshot" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "nickName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "ageDays" INTEGER NOT NULL,
    "specialty" INTEGER,
    "skills" TEXT NOT NULL,
    "lastMatch" TEXT,

    CONSTRAINT "youth_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youth_change" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,

    CONSTRAINT "youth_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youth_match" (
    "id" SERIAL NOT NULL,
    "youthTeamId" INTEGER NOT NULL,
    "matchId" INTEGER NOT NULL,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "matchType" INTEGER NOT NULL,
    "homeTeamId" INTEGER NOT NULL,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "homeGoals" INTEGER,
    "awayGoals" INTEGER,
    "lineupFetchedAt" TIMESTAMP(3),

    CONSTRAINT "youth_match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youth_appearance" (
    "id" SERIAL NOT NULL,
    "youthMatchId" INTEGER NOT NULL,
    "youthPlayerId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "positionCode" INTEGER,
    "behaviour" INTEGER,
    "ratingStars" DOUBLE PRECISION,
    "playedMinutes" INTEGER,

    CONSTRAINT "youth_appearance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youth_club_status" (
    "seniorTeamId" INTEGER NOT NULL,
    "youthTeamId" INTEGER,
    "checkedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youth_club_status_pkey" PRIMARY KEY ("seniorTeamId")
);

-- CreateIndex
CREATE INDEX "youth_academy_seniorTeamId_idx" ON "youth_academy"("seniorTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "youth_player_youthTeamId_youthPlayerId_key" ON "youth_player"("youthTeamId", "youthPlayerId");

-- CreateIndex
CREATE INDEX "youth_snapshot_playerId_fetchedAt_idx" ON "youth_snapshot"("playerId", "fetchedAt");

-- CreateIndex
CREATE INDEX "youth_change_playerId_detectedAt_idx" ON "youth_change"("playerId", "detectedAt");

-- CreateIndex
CREATE INDEX "youth_match_youthTeamId_matchDate_idx" ON "youth_match"("youthTeamId", "matchDate");

-- CreateIndex
CREATE UNIQUE INDEX "youth_match_youthTeamId_matchId_key" ON "youth_match"("youthTeamId", "matchId");

-- CreateIndex
CREATE INDEX "youth_appearance_youthPlayerId_idx" ON "youth_appearance"("youthPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "youth_appearance_youthMatchId_youthPlayerId_key" ON "youth_appearance"("youthMatchId", "youthPlayerId");

-- AddForeignKey
ALTER TABLE "youth_player" ADD CONSTRAINT "youth_player_youthTeamId_fkey" FOREIGN KEY ("youthTeamId") REFERENCES "youth_academy"("youthTeamId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youth_snapshot" ADD CONSTRAINT "youth_snapshot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "youth_player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youth_change" ADD CONSTRAINT "youth_change_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "youth_player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youth_match" ADD CONSTRAINT "youth_match_youthTeamId_fkey" FOREIGN KEY ("youthTeamId") REFERENCES "youth_academy"("youthTeamId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youth_appearance" ADD CONSTRAINT "youth_appearance_youthMatchId_fkey" FOREIGN KEY ("youthMatchId") REFERENCES "youth_match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

