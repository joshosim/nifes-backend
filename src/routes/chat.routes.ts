import { Router } from 'express';
import {
  getConversations,
  getMessages,
  getOrCreateConversation,
  sendMessage,
  markAsRead,
} from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware); // protect all chat routes

router.get('/conversations/:userId', getConversations);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations', getOrCreateConversation);
router.post('/conversations/:conversationId/messages', sendMessage);
router.patch('/conversations/:conversationId/read', markAsRead);

export default router;