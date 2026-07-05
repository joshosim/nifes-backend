import { Router } from 'express';
import { markAttendance } from '../controllers/attendance.controller';
const { authMiddleware } = require('../middleware/auth.middleware');

const router = Router();

// Any authenticated user scans a QR code to mark their attendance
router.post('/mark', authMiddleware, markAttendance);

export default router;
