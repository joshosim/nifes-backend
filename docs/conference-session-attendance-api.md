# Conference session attendance API

All routes require `Authorization: Bearer <token>`. Admin routes additionally require an `ADMIN` user.

## Admin routes

### Create a scheduled session

`POST /api/admin/programs/:conferenceId/sessions`

```json
{
  "title": "Opening session",
  "startTime": "2026-12-01T09:00:00.000Z",
  "endTime": "2026-12-01T10:00:00.000Z"
}
```

Returns `201 { "session": { "id", "conferenceId", "title", "startTime", "endTime", "attendanceOpen", ... } }`.

### List sessions

`GET /api/admin/programs/:conferenceId/sessions` returns `{ "sessions": [...] }`.

### Open attendance and notify attendees

`POST /api/admin/programs/:conferenceId/sessions/:sessionId/attendance/open`

Available only between the session's start and end times. It generates a six-digit code and creates an attendance request for all conference mentees and mentors.

Returns `{ "sessionId", "code", "recipientCount", "attendanceClosesAt" }`. Keep the code in the admin UI for sharing at the session; do not expose it in attendee session-list responses.

### Read the attendance dashboard

`GET /api/admin/programs/:conferenceId/sessions/:sessionId/attendance`

Returns `{ "session": {...}, "count": n, "attendance": [{ "user": { "id", "name", "email", "role" }, "status": "pending|present|declined|absent", ... }] }`.

An unanswered `pending` entry is returned as `absent` once the end time passes. This makes closure automatic at read time without a background worker.

## Attendee routes

### List attendance requests

`GET /api/attendance/sessions/me` returns `{ "sessions": [...] }` for the signed-in mentee or mentor, including current status and conference name.

### Submit the code or decline

`POST /api/attendance/sessions/:sessionId/respond`

Submit:

```json
{ "action": "submit", "code": "482193" }
```

Decline:

```json
{ "action": "decline" }
```

Both actions are accepted only during the session time window and only once per attendee. A correct code records `present`; declining records `declined`. An invalid code returns `400`.

## Delivery and recording notes

The existing backend has an in-app `Notification` table but no push-token or push-provider integration. Opening attendance creates in-app notifications for attendees; it does not deliver OS push notifications yet. A mobile push provider integration is needed for that.

Scheduled conference sessions are separate from the existing `RecordedSession` content library. Recording upload/linking to a scheduled session is not part of this attendance API yet.
