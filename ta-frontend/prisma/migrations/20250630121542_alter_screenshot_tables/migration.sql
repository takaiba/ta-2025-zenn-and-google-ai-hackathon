-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "screenshot" TEXT;

-- AlterTable
ALTER TABLE "JobQueue" ADD COLUMN     "screenshot" TEXT;

-- AlterTable
ALTER TABLE "TestSessionLog" ADD COLUMN     "screenshot" TEXT;
