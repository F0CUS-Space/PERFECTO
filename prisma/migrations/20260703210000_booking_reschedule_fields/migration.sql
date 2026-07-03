-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "rescheduledAt" TIMESTAMP(3),
ADD COLUMN "rescheduleCount" INTEGER NOT NULL DEFAULT 0;
