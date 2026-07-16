-- CreateEnum
CREATE TYPE "BookingOfferStatus" AS ENUM ('DRAFT', 'SENT', 'CONVERTED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'ESTIMATE_CREATE';
ALTER TYPE "AdminAuditAction" ADD VALUE 'ESTIMATE_SEND';
ALTER TYPE "AdminAuditAction" ADD VALUE 'ESTIMATE_CANCEL';

-- CreateTable
CREATE TABLE "BookingOffer" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "BookingOfferStatus" NOT NULL DEFAULT 'DRAFT',
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "staffNotes" TEXT,
    "messageToCustomer" TEXT,
    "createdById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingOffer_token_key" ON "BookingOffer"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BookingOffer_bookingId_key" ON "BookingOffer"("bookingId");

-- CreateIndex
CREATE INDEX "BookingOffer_status_idx" ON "BookingOffer"("status");

-- CreateIndex
CREATE INDEX "BookingOffer_userId_idx" ON "BookingOffer"("userId");

-- CreateIndex
CREATE INDEX "BookingOffer_createdById_idx" ON "BookingOffer"("createdById");

-- CreateIndex
CREATE INDEX "BookingOffer_expiresAt_idx" ON "BookingOffer"("expiresAt");

-- AddForeignKey
ALTER TABLE "BookingOffer" ADD CONSTRAINT "BookingOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingOffer" ADD CONSTRAINT "BookingOffer_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingOffer" ADD CONSTRAINT "BookingOffer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingOffer" ADD CONSTRAINT "BookingOffer_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
