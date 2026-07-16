ALTER TABLE "player_training_week" ADD COLUMN "trainingTypeId" INTEGER;

ALTER TABLE "team_settings" ADD COLUMN "trainingFocusSkillKey" TEXT;
ALTER TABLE "team_settings" ADD COLUMN "estimateBaseWeeks" REAL;
ALTER TABLE "team_settings" ADD COLUMN "estimateAgeIncrementWeeks" REAL;
ALTER TABLE "team_settings" ADD COLUMN "estimateSkillIncrementWeeks" REAL;
