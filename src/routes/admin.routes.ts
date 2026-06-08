import { Router } from 'express';
import { approveMentor, rejectMentor, getPendingMentors } from '../controllers/admin.controller';
const { authMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.get('/pending-mentors', authMiddleware, getPendingMentors);
router.post('/approve-mentor/:userId', authMiddleware, approveMentor);
router.post('/reject-mentor/:userId', authMiddleware, rejectMentor);

export default router;
