-- CreateEnum
CREATE TYPE "FocusArea" AS ENUM ('ACADEMICS', 'SPIRITUAL', 'CAREER', 'MENTAL_HEALTH');

-- CreateTable
CREATE TABLE "MentorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fellowshipPosition" TEXT,
    "campus" TEXT,
    "verificationFileUrl" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "profilePhotoUrl" TEXT,
    "bio" TEXT,
    "focusArea" "FocusArea",
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "availableDays" TEXT[],
    "availableTimeStart" TEXT,
    "availableTimeEnd" TEXT,
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "isOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MentorProfile_userId_key" ON "MentorProfile"("userId");

-- AddForeignKey
ALTER TABLE "MentorProfile" ADD CONSTRAINT "MentorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
