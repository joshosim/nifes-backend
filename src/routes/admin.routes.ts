import { Router } from 'express';
import {
  // Mentors
  getAllMentors,
  getPendingMentors,
  getApprovedMentors,
  getAssignedMentors,
  getMenteesUnderMentor,
  approveMentor,
  rejectMentor,
  // Users
  getAllUsers,
  getAssignedUsers,
  getUnassignedUsers,
  getMentorOfUser,
  // Admins
  getAllAdmins,
  promoteToAdmin,
  deleteUser,
  // Programs
  createProgram,
  getAllPrograms,
  getProgramQRCode,
  getProgramAttendance,
  // Stats
  getDashboardStats,
} from '../controllers/admin.controller';
import {
  addMentor, getMentorTable, getMentorTableByStatus, getAdminUsers, getUsersByAssignment,
  getMentorsMissingVerification, sendMentorVerificationReminders,
  getConferenceList, createConference, publishConference, conferenceDetail, archiveConference, conferencePeople,
  getGroups, createGroup, updateGroup, randomAssign, confirmAssignments, conferenceReport,
  getRecordedSessions, createRecordedSession, updateRecordedSession, deleteRecordedSession,
  publishRecordedSession, setSessionAsset, getAdminProfile, updateAdminProfile,
  updateAdminPassword, updateAdminNotifications,
} from '../controllers/admin.api.controller';
import { uploadProfilePics, uploadTeachingMedia } from '../config/cloundinary';

const { authMiddleware } = require('../middleware/auth.middleware');
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.use(authMiddleware, requireRole('ADMIN'));

// ─── STATS ───────────────────────────────────────────────────
router.get('/stats', getDashboardStats);

// Admin dashboard contract
router.get('/mentors', getMentorTable);
router.get('/mentors/pending', getMentorTableByStatus('pending'));
router.get('/mentors/approved', getMentorTableByStatus('approved'));
router.get('/mentors/rejected', getMentorTableByStatus('rejected'));
router.get('/mentors/missing-verification', getMentorsMissingVerification);
router.post('/mentors/missing-verification/remind', sendMentorVerificationReminders);
router.post('/mentors', addMentor);
router.get('/users', getAdminUsers);
router.get('/users/assigned', getUsersByAssignment(true));
router.get('/users/unassigned', getUsersByAssignment(false));

// Conference and small group management
router.get('/programs/archived', getConferenceList);
router.get('/programs', getConferenceList);
router.post('/programs', createConference);
router.get('/programs/:id', conferenceDetail);
router.patch('/programs/:id/archive', archiveConference);
router.patch('/programs/:id/publish', publishConference);
router.get('/programs/:id/mentors', conferencePeople('mentors'));
router.get('/programs/:id/mentees', conferencePeople('mentees'));
router.get('/programs/:id/groups', getGroups);
router.post('/programs/:id/groups', createGroup);
router.patch('/programs/:id/groups/:groupId', updateGroup);
router.post('/programs/:id/random-assign', randomAssign);
router.post('/programs/:id/confirm-assignments', confirmAssignments);
router.get('/programs/:id/report', conferenceReport);

// Recorded teaching library
router.get('/sessions', getRecordedSessions);
router.post('/sessions', createRecordedSession);
router.get('/sessions/:id', async (req, res, next) => {
  try { const { prisma } = require('../config/database'); const session = await prisma.recordedSession.findUnique({ where: { id: req.params.id }, include: { mentor: { select: { name: true } } } }); if (!session) return res.status(404).json({ message: 'Session not found' }); return res.json({ session: { ...session, mentorName: session.mentor?.name ?? null } }); } catch (error) { return next(error); }
});
router.patch('/sessions/:id', updateRecordedSession);
router.delete('/sessions/:id', deleteRecordedSession);
router.patch('/sessions/:id/publish', publishRecordedSession);
router.post('/sessions/:id/thumbnail', uploadProfilePics.single('file'), setSessionAsset('thumbnailUrl'));
router.post('/sessions/:id/media', uploadTeachingMedia.single('file'), setSessionAsset('mediaUrl'));

// Admin account settings
router.get('/profile', getAdminProfile);
router.patch('/profile', updateAdminProfile);
router.patch('/profile/password', updateAdminPassword);
router.patch('/profile/notifications', updateAdminNotifications);

// ─── MENTOR MANAGEMENT ───────────────────────────────────────
router.get('/mentors', getAllMentors);
router.get('/mentors/pending', getPendingMentors);
router.get('/mentors/approved', getApprovedMentors);
router.get('/mentors/assigned', getAssignedMentors);
router.get('/mentors/:mentorId/mentees', getMenteesUnderMentor);
router.patch('/mentors/:userId/approve', approveMentor);
router.patch('/mentors/:userId/reject', rejectMentor);

// ─── USER MANAGEMENT ─────────────────────────────────────────
router.get('/users', getAllUsers);
router.get('/users/assigned', getAssignedUsers);
router.get('/users/unassigned', getUnassignedUsers);
router.get('/users/:userId/mentor', getMentorOfUser);
router.delete('/users/:userId', deleteUser);

// ─── ADMIN MANAGEMENT ────────────────────────────────────────
router.get('/admins', getAllAdmins);
router.patch('/users/:userId/promote', promoteToAdmin);

// ─── PROGRAMS & ATTENDANCE ───────────────────────────────────
router.post('/programs', createProgram);
router.get('/programs', getAllPrograms);
router.get('/programs/:programId/qr', getProgramQRCode);
router.get('/programs/:programId/attendance', getProgramAttendance);

export default router;
