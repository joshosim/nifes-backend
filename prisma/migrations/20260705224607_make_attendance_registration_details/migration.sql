-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "details" JSONB,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "programs" ALTER COLUMN "attendanceCode" DROP NOT NULL;
