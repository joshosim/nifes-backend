import { Router } from 'express';
import {
  getPendingMentors,
  getApprovedMentors,
  approveMentor,
  rejectMentor,
  getAllUsers,
  getAllAdmins,
  getAllMentors,
  deleteUser,
  getDashboardStats,
} from '../controllers/admin.controller';
const { authMiddleware } = require('../middleware/auth.middleware');
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All admin routes require auth + ADMIN role
router.use(authMiddleware, requireRole('ADMIN'));

// Mentor management
router.get('/mentors/pending', getPendingMentors);
router.get('/mentors/approved', getApprovedMentors);
router.patch('/mentors/:userId/approve', approveMentor);
router.patch('/mentors/:userId/reject', rejectMentor);
router.get('/stats', getDashboardStats)

// User management
router.get('/users', getAllUsers);
router.get('/admins', getAllAdmins);
router.get('/mentors', getAllMentors);
router.delete('/users/:userId', deleteUser);

export default router;
