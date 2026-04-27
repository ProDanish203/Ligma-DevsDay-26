-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "LogEntityType" AS ENUM ('PROJECT', 'NODE', 'PROJECT_INVITATION', 'USER_ACCESS', 'USER');

-- CreateTable
CREATE TABLE "Log" (
    "id" UUID NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "entityType" "LogEntityType" NOT NULL,
    "actorUserId" UUID,
    "targetUserId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Log_id_key" ON "Log"("id");

-- CreateIndex
CREATE INDEX "Log_entityType_entityId_createdAt_idx" ON "Log"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "Log_actorUserId_idx" ON "Log"("actorUserId");

-- CreateIndex
CREATE INDEX "Log_targetUserId_idx" ON "Log"("targetUserId");

-- CreateIndex
CREATE INDEX "Log_createdAt_idx" ON "Log"("createdAt");

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
