CREATE TABLE "conference_sessions" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "attendanceCode" TEXT,
    "attendanceOpen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conference_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conference_session_attendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conference_session_attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conference_sessions_attendanceCode_key" ON "conference_sessions"("attendanceCode");
CREATE INDEX "conference_sessions_conferenceId_startTime_idx" ON "conference_sessions"("conferenceId", "startTime");
CREATE UNIQUE INDEX "conference_session_attendance_sessionId_userId_key" ON "conference_session_attendance"("sessionId", "userId");
CREATE INDEX "conference_session_attendance_userId_status_idx" ON "conference_session_attendance"("userId", "status");

ALTER TABLE "conference_sessions" ADD CONSTRAINT "conference_sessions_conferenceId_fkey"
FOREIGN KEY ("conferenceId") REFERENCES "AdminConference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conference_session_attendance" ADD CONSTRAINT "conference_session_attendance_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "conference_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conference_session_attendance" ADD CONSTRAINT "conference_session_attendance_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
