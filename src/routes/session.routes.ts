import { Router } from 'express';
import { getPublishedSessions } from '../controllers/conference.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.get('/', getPublishedSessions);

export default router;
