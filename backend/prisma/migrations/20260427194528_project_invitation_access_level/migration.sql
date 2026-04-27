-- AlterTable
ALTER TABLE "ProjectInvitation" ADD COLUMN     "accessLevel" "UserAccessLevel" NOT NULL DEFAULT 'VIEWER';
