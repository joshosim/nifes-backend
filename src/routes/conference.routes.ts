import { Router } from 'express';
import {
  getMyGroups,
  getOpenConferences,
  registerForConference,
  updateMyGroupWhatsAppLink,
} from '../controllers/conference.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.get('/', getOpenConferences);
router.post('/:id/register', registerForConference);
router.get('/groups/me', getMyGroups);
router.patch('/groups/:groupId/whatsapp', updateMyGroupWhatsAppLink);

export default router;
