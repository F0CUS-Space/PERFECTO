-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM (
  'BOOKING_STATUS_UPDATE',
  'SERVICE_CREATE',
  'SERVICE_UPDATE',
  'SERVICE_DELETE',
  'SERVICE_ADDONS_UPDATE',
  'ADDON_CREATE',
  'ADDON_UPDATE',
  'ADDON_DELETE',
  'APPLICATION_STATUS_UPDATE',
  'JOB_CREATE',
  'JOB_UPDATE',
  'JOB_DELETE',
  'USER_PROMOTE_ADMIN',
  'USER_DEMOTE_ADMIN',
  'GALLERY_CREATE',
  'GALLERY_UPDATE',
  'GALLERY_DELETE',
  'REVIEW_UPDATE',
  'REVIEW_DELETE'
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorId_idx" ON "AdminAuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
