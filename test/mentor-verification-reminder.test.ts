import assert from 'node:assert/strict';
import test from 'node:test';
import { needsMentorVerificationReminder } from '../src/utils/mentor-verification-reminder';

test('reminds mentors without a profile or any required verification detail', () => {
  assert.equal(needsMentorVerificationReminder({ mentorProfile: null }), true);
  assert.equal(needsMentorVerificationReminder({
    mentorProfile: {
      fellowshipPosition: 'Unit Leader',
      campus: 'Owerri',
      verificationFileUrl: null,
    },
  }), true);
  assert.equal(needsMentorVerificationReminder({
    mentorProfile: {
      fellowshipPosition: ' ',
      campus: 'Owerri',
      verificationFileUrl: 'https://example.test/id.pdf',
    },
  }), true);
});

test('does not remind mentors with complete verification information', () => {
  assert.equal(needsMentorVerificationReminder({
    mentorProfile: {
      fellowshipPosition: 'Unit Leader',
      campus: 'Owerri',
      verificationFileUrl: 'https://example.test/id.pdf',
    },
  }), false);
});
