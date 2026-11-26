# Mentor mentees endpoint

## `GET /api/mentorship/my-mentees`

Returns the mentees assigned to the signed-in, approved mentor. Authentication is required; the mentor is taken from the access token, and the endpoint accepts no mentor ID from the client. The route keeps the existing approved-mentor authorization check.

The response combines mentees from accepted mentorship requests and members of admin-managed conference small groups facilitated by the signed-in mentor. A mentee present in more than one assignment source appears once. Only assignments belonging to the authenticated mentor are included.

Successful response (`200`):

```json
{
  "mentees": [
    {
      "id": "mentee-id",
      "name": "Mentee Name",
      "email": "mentee@example.com",
      "avatar": null,
      "nifesSchool": "School",
      "courseOfStudy": "Course",
      "level": "Level"
    }
  ]
}
```

Each mentee object has the fields shown above; profile fields may be `null` when not provided. If there are no assignments, the response is `{ "mentees": [] }`.
