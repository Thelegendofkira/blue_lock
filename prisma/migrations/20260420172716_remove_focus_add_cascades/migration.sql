/*
  Warnings:

  - You are about to drop the column `focusState` on the `DailyLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DailyLog" DROP COLUMN "focusState";

-- DropEnum
DROP TYPE "FocusState";
