/*
  Warnings:

  - You are about to drop the column `format` on the `TestReport` table. All the data in the column will be lost.
  - You are about to drop the column `report_url` on the `TestReport` table. All the data in the column will be lost.
  - Added the required column `report_content` to the `TestReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TestReport" DROP COLUMN "format",
DROP COLUMN "report_url",
ADD COLUMN     "report_content" TEXT NOT NULL;
