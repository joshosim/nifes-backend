import { Router } from 'express';
import {
  getPendingMentors,
  getApprovedMentors,
  getDashboardStats,
} from '../controllers/admin.controller';
const { authMiddleware } = require('../middleware/auth.middleware');
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All admin routes require auth + ADMIN role
router.use(authMiddleware, requireRole('ADMIN'));

// total users
router.get('/admin/total_users', getDashboardStats);

//total approved mentors
router.get('/admin/total_approved_mentors', getApprovedMentors);

//total pending mentors
router.get('/admin/total_pending_mentors', getPendingMentors);

// active sessions
router.get('/admin/active_sessions', getDashboardStats);

export default router;
