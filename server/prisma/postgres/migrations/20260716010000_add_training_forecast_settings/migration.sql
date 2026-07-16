ALTER TABLE "player_training_week" ADD COLUMN "trainingTypeId" INTEGER;

ALTER TABLE "team_settings" ADD COLUMN "trainingFocusSkillKey" TEXT;
ALTER TABLE "team_settings" ADD COLUMN "estimateBaseWeeks" DOUBLE PRECISION;
ALTER TABLE "team_settings" ADD COLUMN "estimateAgeIncrementWeeks" DOUBLE PRECISION;
ALTER TABLE "team_settings" ADD COLUMN "estimateSkillIncrementWeeks" DOUBLE PRECISION;
