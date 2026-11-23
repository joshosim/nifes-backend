import assert from 'node:assert/strict';
import test from 'node:test';
import { createBalancedAssignmentPreview } from '../src/utils/conference-assignment';

const mentors = ['mentor-1', 'mentor-2', 'mentor-3'].map((id) => ({ id, name: id }));

test('distributes male and female mentees evenly across mentor-led groups', () => {
  const mentees = Array.from({ length: 12 }, (_, index) => ({
    id: `mentee-${index}`,
    name: `Mentee ${index}`,
    gender: index < 6 ? 'FEMALE' : 'MALE',
  }));
  const preview = createBalancedAssignmentPreview([], mentors, mentees);

  assert.ok(preview);
  assert.equal(preview.groups.length, 3);
  assert.deepEqual(preview.groups.map((group) => group.size).sort(), [4, 4, 4]);
  assert.ok(preview.groups.every((group) =>
    group.genderBalance.female === 2 && group.genderBalance.male === 2,
  ));
});

test('assigns mentees who did not disclose gender and avoids empty auto-created groups', () => {
  const mentees = [
    { id: 'female', name: 'Female mentee', gender: 'FEMALE' },
    { id: 'male', name: 'Male mentee', gender: 'MALE' },
    { id: 'undisclosed', name: 'Undisclosed mentee', gender: null },
  ];
  const preview = createBalancedAssignmentPreview([], mentors, mentees);

  assert.ok(preview);
  assert.equal(preview.groups.length, mentees.length);
  assert.equal(preview.totalAllocated, mentees.length);
  assert.equal(
    preview.groups.reduce((count, group) => count + group.genderBalance.undisclosed, 0),
    1,
  );
});

test('preserves existing group members while proposing only unassigned mentees', () => {
  const existingGroup = {
    id: 'group-1',
    name: 'Group 1',
    facilitatorId: 'mentor-1',
    facilitatorName: 'Mentor One',
    members: [{
      menteeId: 'already-assigned',
      mentee: { id: 'already-assigned', name: 'Already assigned', gender: 'FEMALE' },
    }],
  };
  const preview = createBalancedAssignmentPreview(
    [existingGroup],
    [mentors[0]],
    [{ id: 'new-mentee', name: 'New mentee', gender: 'MALE' }],
  );

  assert.ok(preview);
  assert.equal(preview.groups[0].id, existingGroup.id);
  assert.equal(preview.groups[0].preserved, 1);
  assert.equal(preview.groups[0].proposed, 1);
  assert.deepEqual(preview.groups[0].menteeIds, ['already-assigned', 'new-mentee']);
});

test('does not propose assignments when no registered mentors are available', () => {
  assert.equal(createBalancedAssignmentPreview([], [], [
    { id: 'mentee-1', name: 'Mentee', gender: null },
  ]), null);
});
