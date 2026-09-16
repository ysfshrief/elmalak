-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "attendancePointValue" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "attendancePointsEnabled" BOOLEAN NOT NULL DEFAULT false;
