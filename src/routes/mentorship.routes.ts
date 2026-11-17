import { Router } from 'express';
import {
  sendRequest,
  getMenteeRequestStatus,
  getMentorIncomingRequests,
  respondToRequest,
  getMyMentees,
  getMenteesByMentor,
} from '../controllers/mentorship.controller';
import { requireApprovedMentor, requireOwnApprovedMentor } from '../middleware/mentor-approval.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
const { authMiddleware } = require('../middleware/auth.middleware');

router.post('/request/:mentorId', authMiddleware, requireRole('USER'), sendRequest);
router.get('/my-requests', authMiddleware, requireRole('USER'), getMenteeRequestStatus);
router.get('/incoming', authMiddleware, requireApprovedMentor, getMentorIncomingRequests);
router.patch('/request/:requestId/respond', authMiddleware, requireApprovedMentor, respondToRequest);
router.get('/my-mentees', authMiddleware, requireApprovedMentor, getMyMentees);
router.get('/mentees/:mentorId', authMiddleware, requireOwnApprovedMentor('mentorId'), getMenteesByMentor);

export default router;
