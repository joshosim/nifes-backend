ALTER TABLE "User"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "designation" TEXT,
  ADD COLUMN "profilePhotoUrl" TEXT,
  ADD COLUMN "notificationPreferences" JSONB;

ALTER TABLE "MentorProfile"
  ADD COLUMN "affiliation" TEXT,
  ADD COLUMN "focusAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "AdminConference" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "zone" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminConference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConferenceMentor" (
  "conferenceId" TEXT NOT NULL,
  "mentorId" TEXT NOT NULL,
  CONSTRAINT "ConferenceMentor_pkey" PRIMARY KEY ("conferenceId", "mentorId")
);
CREATE TABLE "ConferenceMentee" (
  "conferenceId" TEXT NOT NULL,
  "menteeId" TEXT NOT NULL,
  CONSTRAINT "ConferenceMentee_pkey" PRIMARY KEY ("conferenceId", "menteeId")
);
CREATE TABLE "AdminGroup" (
  "id" TEXT NOT NULL,
  "conferenceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "facilitatorId" TEXT,
  CONSTRAINT "AdminGroup_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AdminGroupMember" (
  "groupId" TEXT NOT NULL,
  "menteeId" TEXT NOT NULL,
  CONSTRAINT "AdminGroupMember_pkey" PRIMARY KEY ("groupId", "menteeId")
);
CREATE TABLE "RecordedSession" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "series" TEXT,
  "mentorId" TEXT,
  "contentType" TEXT NOT NULL,
  "duration" TEXT,
  "keyTakeaways" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'draft',
  "thumbnailUrl" TEXT,
  "mediaUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecordedSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminGroup_conferenceId_name_key" ON "AdminGroup"("conferenceId", "name");
CREATE INDEX "RecordedSession_mentorId_idx" ON "RecordedSession"("mentorId");

ALTER TABLE "ConferenceMentor" ADD CONSTRAINT "ConferenceMentor_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "AdminConference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConferenceMentor" ADD CONSTRAINT "ConferenceMentor_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConferenceMentee" ADD CONSTRAINT "ConferenceMentee_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "AdminConference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConferenceMentee" ADD CONSTRAINT "ConferenceMentee_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminGroup" ADD CONSTRAINT "AdminGroup_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "AdminConference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminGroup" ADD CONSTRAINT "AdminGroup_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminGroupMember" ADD CONSTRAINT "AdminGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AdminGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminGroupMember" ADD CONSTRAINT "AdminGroupMember_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecordedSession" ADD CONSTRAINT "RecordedSession_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
