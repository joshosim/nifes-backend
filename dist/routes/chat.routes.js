"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const mentor_approval_middleware_1 = require("../middleware/mentor-approval.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware); // protect all chat routes
router.use(mentor_approval_middleware_1.requireMentorApprovalForChat);
router.get('/conversations/:userId', chat_controller_1.getConversations);
router.get('/conversations/:conversationId/messages', chat_controller_1.getMessages);
router.post('/conversations', chat_controller_1.getOrCreateConversation);
router.post('/conversations/:conversationId/messages', chat_controller_1.sendMessage);
router.patch('/conversations/:conversationId/read', chat_controller_1.markAsRead);
exports.default = router;
