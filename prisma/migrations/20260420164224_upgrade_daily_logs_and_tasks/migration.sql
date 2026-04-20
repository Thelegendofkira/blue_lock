-- DropIndex
DROP INDEX "DailyLog_userId_date_hourBlock_key";

-- AlterTable
ALTER TABLE "DailyLog" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "timeSpent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "GoalNode" ADD COLUMN     "estimatedTime" DOUBLE PRECISION,
ADD COLUMN     "isTask" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quantifierUnit" TEXT;
