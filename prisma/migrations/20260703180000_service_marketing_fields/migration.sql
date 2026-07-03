-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "longDescription" TEXT,
ADD COLUMN     "includes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "idealFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pricingNote" TEXT;
