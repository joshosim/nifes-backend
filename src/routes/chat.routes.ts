import { Router } from 'express';
import {
  getConversations,
  getMessages,
  getOrCreateConversation,
  sendMessage,
  markAsRead,
} from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireMentorApprovalForChat } from '../middleware/mentor-approval.middleware';
import { RequestHandler } from 'express';

const router = Router();

router.use(authMiddleware as RequestHandler); // protect all chat routes
router.use(requireMentorApprovalForChat);

router.get('/conversations/:userId', getConversations);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations', getOrCreateConversation);
router.post('/conversations/:conversationId/messages', sendMessage);
router.patch('/conversations/:conversationId/read', markAsRead);

export default router;