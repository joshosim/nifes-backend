import assert from 'node:assert/strict';
import test from 'node:test';
import { getMyMentees } from '../src/controllers/mentorship.controller';
import { prisma } from '../src/config/database';

type Mentee = {
  id: string; name: string; email: string; avatar: string | null;
  nifesSchool: string | null; courseOfStudy: string | null; level: string | null;
};

const mentee = (id: string): Mentee => ({
  id, name: `Name ${id}`, email: `${id}@example.com`, avatar: null,
  nifesSchool: 'School', courseOfStudy: 'Course', level: 'Level',
});

async function callEndpoint(accepted: Mentee[], groups: Mentee[][]) {
  const originalRequests = prisma.mentorshipRequest.findMany;
  const originalGroups = prisma.adminGroup.findMany;
  let requestQuery: any;
  let groupQuery: any;
  (prisma.mentorshipRequest as any).findMany = async (query: any) => {
    requestQuery = query;
    return accepted.map((value) => ({ mentee: value }));
  };
  (prisma.adminGroup as any).findMany = async (query: any) => {
    groupQuery = query;
    return groups.map((members) => ({ members: members.map((value) => ({ mentee: value })) }));
  };

  let statusCode = 200;
  let body: any;
  const res: any = {
    status(code: number) { statusCode = code; return this; },
    json(value: unknown) { body = value; return this; },
  };
  try {
    await getMyMentees({ user: { id: 'mentor-authenticated', email: 'mentor@example.com', role: 'MENTOR' } } as any, res);
    return { statusCode, body, requestQuery, groupQuery };
  } finally {
    (prisma.mentorshipRequest as any).findMany = originalRequests;
    (prisma.adminGroup as any).findMany = originalGroups;
  }
}

test('returns accepted mentorship assignments for the authenticated mentor', async () => {
  const result = await callEndpoint([mentee('accepted')], []);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { mentees: [mentee('accepted')] });
  assert.deepEqual(result.requestQuery.where, { mentorId: 'mentor-authenticated', status: 'ACCEPTED' });
});

test('returns mentees assigned through facilitated conference groups', async () => {
  const result = await callEndpoint([], [[mentee('conference')]]);
  assert.deepEqual(result.body, { mentees: [mentee('conference')] });
  assert.deepEqual(result.groupQuery.where, { facilitatorId: 'mentor-authenticated' });
});

test('deduplicates mentees present in both assignment sources or multiple groups', async () => {
  const shared = mentee('shared');
  const result = await callEndpoint([shared], [[shared, mentee('group-only')], [shared]]);
  assert.deepEqual(result.body, { mentees: [shared, mentee('group-only')] });
});

test('returns an empty mentee list when the mentor has no assignments', async () => {
  const result = await callEndpoint([], []);
  assert.deepEqual(result.body, { mentees: [] });
});
