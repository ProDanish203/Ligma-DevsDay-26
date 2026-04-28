-- CreateEnum
CREATE TYPE "NodeIntent" AS ENUM ('ACTION_ITEM', 'DECISION', 'OPEN_QUESTION', 'REFERENCE', 'UNCLASSIFIED');

-- CreateEnum
CREATE TYPE "NodeRole" AS ENUM ('LEAD', 'CONTRIBUTOR', 'VIEWER');

-- DropIndex
DROP INDEX "CanvasNode_id_key";

-- DropIndex
DROP INDEX "Project_id_key";

-- AlterTable
ALTER TABLE "CanvasNode" ADD COLUMN     "intent" "NodeIntent" NOT NULL DEFAULT 'UNCLASSIFIED',
ADD COLUMN     "lockedToRole" "NodeRole";

-- CreateTable
CREATE TABLE "TaskBoard" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TaskBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "taskBoardId" UUID NOT NULL,
    "canvasNodeId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskBoard_projectId_key" ON "TaskBoard"("projectId");

-- CreateIndex
CREATE INDEX "Task_taskBoardId_idx" ON "Task"("taskBoardId");

-- CreateIndex
CREATE INDEX "Task_canvasNodeId_idx" ON "Task"("canvasNodeId");

-- CreateIndex
CREATE INDEX "CanvasNode_intent_idx" ON "CanvasNode"("intent");

-- AddForeignKey
ALTER TABLE "CanvasNode" ADD CONSTRAINT "CanvasNode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskBoard" ADD CONSTRAINT "TaskBoard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_taskBoardId_fkey" FOREIGN KEY ("taskBoardId") REFERENCES "TaskBoard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_canvasNodeId_fkey" FOREIGN KEY ("canvasNodeId") REFERENCES "CanvasNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
