-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN "compensation" TEXT;

-- Backfill existing rows before enforcing NOT NULL
UPDATE "JobPosting" SET "compensation" = 'Competitive pay' WHERE "compensation" IS NULL;

ALTER TABLE "JobPosting" ALTER COLUMN "compensation" SET NOT NULL;
