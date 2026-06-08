import { Router } from 'express';
import { createProgram, markAttendance, getProgramAttendance, getAllPrograms } from '../controllers/attendance.controller';
const { authMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.post('/programs', authMiddleware, createProgram);
router.get('/programs', authMiddleware, getAllPrograms);
router.get('/programs/:programId', authMiddleware, getProgramAttendance);
router.post('/mark', authMiddleware, markAttendance);

export default router;
