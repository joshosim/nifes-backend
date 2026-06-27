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
router.post('/mentors/:userId/approve', approveMentor);
router.post('/mentors/:userId/reject', rejectMentor);
router.post('/stats', getDashboardStats)

// User management
router.get('/users', getAllUsers);
router.get('/admins', getAllAdmins);
router.post('/mentors', getAllMentors);
router.delete('/users/:userId', deleteUser);

export default router;
