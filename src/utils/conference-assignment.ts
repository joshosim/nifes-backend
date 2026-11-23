import { randomUUID } from 'node:crypto';

type Mentee = {
  id: string;
  name: string;
  gender: string | null;
};

type Mentor = {
  id: string;
  name: string;
};

type ExistingGroup = {
  id: string;
  name: string;
  facilitatorId: string | null;
  facilitatorName: string | null;
  members: Array<{ menteeId: string; mentee: Mentee }>;
};

type AssignmentGroup = {
  id: string;
  name: string;
  facilitatorId: string | null;
  facilitatorName: string;
  members: Array<{ id: string; name: string; status: 'preserved' | 'proposed' }>;
  menteeIds: string[];
  preserved: number;
  proposed: number;
  size: number;
  genderBalance: { female: number; male: number; undisclosed: number };
};

function shuffle<T>(values: T[]): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function genderBucket(gender: string | null | undefined) {
  const normalized = gender?.toUpperCase();
  return normalized === 'FEMALE' || normalized === 'MALE' ? normalized : 'UNDISCLOSED';
}

export function createBalancedAssignmentPreview(
  existingGroups: ExistingGroup[],
  mentors: Mentor[],
  unassignedMentees: Mentee[],
) {
  const assignedMentorIds = new Set(
    existingGroups.flatMap((group) => group.facilitatorId ? [group.facilitatorId] : []),
  );
  const unusedMentors = shuffle(mentors.filter((mentor) => !assignedMentorIds.has(mentor.id)));
  let nextMentorIndex = 0;

  const groups: AssignmentGroup[] = existingGroups.map((group) => {
    let facilitatorId = group.facilitatorId;
    let facilitatorName = group.facilitatorName ?? '';
    if (!facilitatorId && unusedMentors[nextMentorIndex]) {
      const mentor = unusedMentors[nextMentorIndex];
      nextMentorIndex += 1;
      assignedMentorIds.add(mentor.id);
      facilitatorId = mentor.id;
      facilitatorName = mentor.name;
    }

    const members = group.members.map(({ menteeId, mentee }) => ({
      id: menteeId,
      name: mentee.name,
      status: 'preserved' as const,
    }));
    const genderBalance = { female: 0, male: 0, undisclosed: 0 };
    for (const { mentee } of group.members) {
      const bucket = genderBucket(mentee.gender);
      genderBalance[bucket === 'FEMALE' ? 'female' : bucket === 'MALE' ? 'male' : 'undisclosed'] += 1;
    }

    return {
      id: group.id,
      name: group.name,
      facilitatorId,
      facilitatorName,
      members,
      menteeIds: members.map((member) => member.id),
      preserved: members.length,
      proposed: 0,
      size: members.length,
      genderBalance,
    };
  });

  const occupiedGroupCount = existingGroups.filter((group) => group.members.length > 0).length;
  const desiredGroupCount = Math.min(mentors.length, occupiedGroupCount + unassignedMentees.length);
  const additionalGroupCount = Math.max(0, desiredGroupCount - existingGroups.length);
  for (const mentor of unusedMentors.slice(nextMentorIndex, nextMentorIndex + additionalGroupCount)) {
    groups.push({
      id: randomUUID(),
      name: `Group ${String(groups.length + 1).padStart(2, '0')}`,
      facilitatorId: mentor.id,
      facilitatorName: mentor.name,
      members: [],
      menteeIds: [],
      preserved: 0,
      proposed: 0,
      size: 0,
      genderBalance: { female: 0, male: 0, undisclosed: 0 },
    });
  }

  if (!groups.length) return null;

  const additionsByGender = {
    FEMALE: shuffle(unassignedMentees.filter((mentee) => genderBucket(mentee.gender) === 'FEMALE')),
    MALE: shuffle(unassignedMentees.filter((mentee) => genderBucket(mentee.gender) === 'MALE')),
    UNDISCLOSED: shuffle(unassignedMentees.filter((mentee) => genderBucket(mentee.gender) === 'UNDISCLOSED')),
  };
  const assignToSmallestGroup = (mentee: Mentee, bucket: keyof typeof additionsByGender) => {
    const genderKey = bucket === 'FEMALE' ? 'female' : bucket === 'MALE' ? 'male' : 'undisclosed';
    const smallestCount = Math.min(...groups.map((group) => group.genderBalance[genderKey]));
    const genderTied = groups.filter((group) => group.genderBalance[genderKey] === smallestCount);
    const smallestSize = Math.min(...genderTied.map((group) => group.size));
    const candidates = genderTied.filter((group) => group.size === smallestSize);
    const group = candidates[Math.floor(Math.random() * candidates.length)];
    group.members.push({ id: mentee.id, name: mentee.name, status: 'proposed' });
    group.menteeIds.push(mentee.id);
    group.proposed += 1;
    group.size += 1;
    group.genderBalance[genderKey] += 1;
  };

  for (const gender of ['FEMALE', 'MALE', 'UNDISCLOSED'] as const) {
    additionsByGender[gender].forEach((mentee) => assignToSmallestGroup(mentee, gender));
  }

  return {
    preservedRelationships: existingGroups.reduce((count, group) => count + group.members.length, 0),
    newProposals: unassignedMentees.length,
    totalAllocated:
      existingGroups.reduce((count, group) => count + group.members.length, 0) +
      unassignedMentees.length,
    mentorLedGroups: groups.filter((group) => group.facilitatorId).length,
    groups,
  };
}
