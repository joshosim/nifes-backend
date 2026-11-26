import { Router } from 'express';
import { markAttendance } from '../controllers/attendance.controller';
import { getMySessionAttendance, respondToSessionAttendance } from '../controllers/conference-attendance.controller';
const { authMiddleware } = require('../middleware/auth.middleware');

const router = Router();

// Any authenticated user scans a QR code to mark their attendance
router.post('/mark', authMiddleware, markAttendance);
router.get('/sessions/me', authMiddleware, getMySessionAttendance);
router.post('/sessions/:sessionId/respond', authMiddleware, respondToSessionAttendance);

export default router;
