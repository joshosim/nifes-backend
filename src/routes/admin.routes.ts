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

const { authMiddleware } = require('../middleware/auth.middleware');
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.use(authMiddleware, requireRole('ADMIN'));

// ─── STATS ───────────────────────────────────────────────────
router.get('/stats', getDashboardStats);

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
