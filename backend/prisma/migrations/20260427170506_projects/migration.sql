-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "UserAccessLevel" AS ENUM ('VIEWER', 'EDITOR', 'COMMENTATOR', 'LEAD');

-- CreateEnum
CREATE TYPE "UserAccessType" AS ENUM ('PROJECT', 'NODE');

-- CreateTable
CREATE TABLE "ProjectInvitation" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" UUID NOT NULL,
    "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccess" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "entityType" "UserAccessType" NOT NULL DEFAULT 'PROJECT',
    "accessLevel" "UserAccessLevel" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInvitation_id_key" ON "ProjectInvitation"("id");

-- CreateIndex
CREATE INDEX "ProjectInvitation_email_idx" ON "ProjectInvitation"("email");

-- CreateIndex
CREATE INDEX "ProjectInvitation_projectId_idx" ON "ProjectInvitation"("projectId");

-- CreateIndex
CREATE INDEX "ProjectInvitation_status_idx" ON "ProjectInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInvitation_projectId_email_key" ON "ProjectInvitation"("projectId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_id_key" ON "Project"("id");

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "Project"("name");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_userId_key" ON "Project"("name", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccess_id_key" ON "UserAccess"("id");

-- CreateIndex
CREATE INDEX "UserAccess_userId_idx" ON "UserAccess"("userId");

-- CreateIndex
CREATE INDEX "UserAccess_entityType_entityId_idx" ON "UserAccess"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccess_userId_entityType_entityId_key" ON "UserAccess"("userId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "ProjectInvitation" ADD CONSTRAINT "ProjectInvitation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
