type MentorVerificationDetails = {
  fellowshipPosition: string | null;
  campus: string | null;
  verificationFileUrl: string | null;
};

type MentorAccount = {
  mentorProfile: MentorVerificationDetails | null;
};

export function needsMentorVerificationReminder(mentor: MentorAccount) {
  const profile = mentor.mentorProfile;
  return (
    !profile ||
    !profile.fellowshipPosition?.trim() ||
    !profile.campus?.trim() ||
    !profile.verificationFileUrl?.trim()
  );
}
