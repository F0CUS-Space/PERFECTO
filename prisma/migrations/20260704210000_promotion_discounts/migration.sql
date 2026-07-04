-- CreateEnum
CREATE TYPE "PromotionDiscountType" AS ENUM ('FLAT', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN "discountType" "PromotionDiscountType" NOT NULL DEFAULT 'FLAT';
ALTER TABLE "Promotion" ADD COLUMN "discountValue" INTEGER NOT NULL DEFAULT 3000;
ALTER TABLE "Promotion" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "PromotionOnService" (
    "promotionId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "PromotionOnService_pkey" PRIMARY KEY ("promotionId","serviceId")
);

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "promotionId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "promotionDiscountCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "promotionId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "promotionTitle" TEXT;
ALTER TABLE "Booking" ADD COLUMN "promotionDiscountCents" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Promotion_isActive_idx" ON "Promotion"("isActive");

-- AddForeignKey
ALTER TABLE "PromotionOnService" ADD CONSTRAINT "PromotionOnService_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionOnService" ADD CONSTRAINT "PromotionOnService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
