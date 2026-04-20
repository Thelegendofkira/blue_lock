-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'PAUSED', 'STOPPED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EffortType" AS ENUM ('DEEP_WORK', 'SHALLOW_WORK', 'NO_EFFORT', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('TASK_EXECUTION', 'SLEEP', 'COLLEGE');

-- CreateEnum
CREATE TYPE "FocusState" AS ENUM ('FOCUSED', 'DISTRACTED', 'N_A');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalNode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),
    "effortType" "EffortType" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "targetQuantity" DOUBLE PRECISION,
    "currentQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "GoalNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hourBlock" INTEGER NOT NULL,
    "blockType" "BlockType" NOT NULL,
    "focusState" "FocusState" NOT NULL DEFAULT 'N_A',
    "taskId" TEXT,
    "valueAchieved" DOUBLE PRECISION,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "GoalNode_userId_idx" ON "GoalNode"("userId");

-- CreateIndex
CREATE INDEX "GoalNode_parentId_idx" ON "GoalNode"("parentId");

-- CreateIndex
CREATE INDEX "DailyLog_userId_date_idx" ON "DailyLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_userId_date_hourBlock_key" ON "DailyLog"("userId", "date", "hourBlock");

-- AddForeignKey
ALTER TABLE "GoalNode" ADD CONSTRAINT "GoalNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GoalNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalNode" ADD CONSTRAINT "GoalNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "GoalNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
