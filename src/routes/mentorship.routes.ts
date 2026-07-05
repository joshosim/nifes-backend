import { Router } from 'express';
import {
  sendRequest,
  getMenteeRequestStatus,
  getMentorIncomingRequests,
  respondToRequest,
  getMyMentees,
  getMenteesByMentor,
} from '../controllers/mentorship.controller';

const router = Router();
const { authMiddleware } = require('../middleware/auth.middleware');

router.post('/request/:mentorId', authMiddleware, sendRequest);
router.get('/my-requests', authMiddleware, getMenteeRequestStatus);
router.get('/incoming', authMiddleware, getMentorIncomingRequests);
router.patch('/request/:requestId/respond', authMiddleware, respondToRequest);
router.get('/my-mentees', authMiddleware, getMyMentees);
router.get('/mentees/:mentorId', getMenteesByMentor);

export default router;
