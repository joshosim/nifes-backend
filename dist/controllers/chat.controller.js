"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.sendMessage = exports.getOrCreateConversation = exports.getMessages = exports.getConversations = void 0;
const database_1 = require("../config/database");
const mentor_approval_middleware_1 = require("../middleware/mentor-approval.middleware");
const getAuthenticatedUser = (req) => req.user;
// GET /chat/conversations/:userId
// Returns all conversations for a user (as mentor or mentee), latest message first
const getConversations = async (req, res) => {
    try {
        const { userId } = req.params;
        const authenticatedUserId = getAuthenticatedUser(req).id;
        if (String(userId) !== authenticatedUserId) {
            return res.status(403).json({ message: 'You can only view your own conversations' });
        }
        const conversations = await database_1.prisma.conversation.findMany({
            where: {
                OR: [{ mentorId: String(userId) }, { userId: String(userId) }],
                mentor: {
                    mentorProfile: {
                        is: { verificationStatus: 'approved', isOnboardingComplete: true },
                    },
                },
            },
            include: {
                mentor: {
                    select: { id: true, name: true, avatar: true },
                },
                user: {
                    select: { id: true, name: true, avatar: true },
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1, // last message preview
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
        // Attach unread count per conversation
        const withUnread = await Promise.all(conversations.map(async (convo) => {
            const unreadCount = await database_1.prisma.message.count({
                where: {
                    conversationId: convo.id,
                    isRead: false,
                    senderId: { not: String(userId) }, // messages sent TO this user
                },
            });
            return { ...convo, unreadCount };
        }));
        return res.status(200).json({ conversations: withUnread });
    }
    catch (error) {
        console.error('getConversations error:', error);
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getConversations = getConversations;
// GET /chat/conversations/:conversationId/messages?cursor=<messageId>&limit=20
// Paginated message history — cursor-based so Flutter can load older messages
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { cursor, limit = '20' } = req.query;
        const take = Math.min(Number(limit), 50); // cap at 50
        const userId = getAuthenticatedUser(req).id;
        const conversation = await database_1.prisma.conversation.findUnique({
            where: { id: String(conversationId) },
            select: { mentorId: true, userId: true },
        });
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }
        if (conversation.mentorId !== userId && conversation.userId !== userId) {
            return res.status(403).json({ message: 'You are not part of this conversation' });
        }
        if (!(await (0, mentor_approval_middleware_1.isMentorApproved)(conversation.mentorId))) {
            return res.status(403).json({ message: 'This mentor is not approved for chat' });
        }
        const messages = await database_1.prisma.message.findMany({
            where: { conversationId: String(conversationId) },
            orderBy: { createdAt: 'desc' },
            take: take + 1, // fetch one extra to know if there's a next page
            ...(cursor && {
                cursor: { id: String(cursor) },
                skip: 1,
            }),
            include: {
                sender: {
                    select: { id: true, name: true, avatar: true },
                },
            },
        });
        const hasMore = messages.length > take;
        const result = hasMore ? messages.slice(0, take) : messages;
        const nextCursor = hasMore ? result[result.length - 1].id : null;
        return res.status(200).json({
            messages: result.reverse(), // oldest first for UI rendering
            nextCursor,
            hasMore,
        });
    }
    catch (error) {
        console.error('getMessages error:', error);
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getMessages = getMessages;
// POST /chat/conversations
// Creates or returns the existing conversation between mentor and mentee
const getOrCreateConversation = async (req, res) => {
    try {
        const { mentorId, userId } = req.body;
        const authenticatedUser = getAuthenticatedUser(req);
        if (!mentorId || !userId) {
            return res.status(400).json({ message: 'mentorId and userId are required' });
        }
        if (mentorId === userId) {
            return res.status(400).json({ message: 'Mentor and user cannot be the same person' });
        }
        if ((authenticatedUser.role === 'USER' && authenticatedUser.id !== userId) ||
            (authenticatedUser.role === 'MENTOR' && authenticatedUser.id !== mentorId)) {
            return res.status(403).json({ message: 'You can only start a conversation for your account' });
        }
        // Verify both users exist and mentor has the right role
        const [mentor, user] = await Promise.all([
            database_1.prisma.user.findUnique({ where: { id: mentorId } }),
            database_1.prisma.user.findUnique({ where: { id: userId } }),
        ]);
        if (!mentor || mentor.role !== 'MENTOR') {
            return res.status(404).json({ message: 'Mentor not found' });
        }
        if (!(await (0, mentor_approval_middleware_1.isMentorApproved)(mentorId))) {
            return res.status(403).json({ message: 'Mentor approval is required to start a conversation' });
        }
        if (!user || user.role !== 'USER') {
            return res.status(404).json({ message: 'User not found' });
        }
        const conversation = await database_1.prisma.conversation.upsert({
            where: { mentorId_userId: { mentorId, userId } },
            update: {}, // already exists, just return it
            create: { mentorId, userId },
            include: {
                mentor: { select: { id: true, name: true, avatar: true } },
                user: { select: { id: true, name: true, avatar: true } },
            },
        });
        return res.status(200).json({ conversation });
    }
    catch (error) {
        console.error('getOrCreateConversation error:', error);
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getOrCreateConversation = getOrCreateConversation;
// POST /chat/conversations/:conversationId/messages
// REST fallback for sending a message (when socket isn't connected)
const sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;
        const senderId = getAuthenticatedUser(req).id;
        if (!senderId || !content?.trim()) {
            return res.status(400).json({ message: 'content is required' });
        }
        // Verify sender belongs to this conversation
        const conversation = await database_1.prisma.conversation.findUnique({
            where: { id: String(conversationId) },
        });
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }
        const isParticipant = conversation.mentorId === senderId || conversation.userId === senderId;
        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not part of this conversation' });
        }
        if (!(await (0, mentor_approval_middleware_1.isMentorApproved)(conversation.mentorId))) {
            return res.status(403).json({ message: 'This mentor is not approved for chat' });
        }
        const [message] = await database_1.prisma.$transaction([
            database_1.prisma.message.create({
                data: { conversationId: String(conversationId), senderId, content: content.trim() },
                include: {
                    sender: { select: { id: true, name: true, avatar: true } },
                },
            }),
            // Bump conversation updatedAt so it sorts to top of list
            database_1.prisma.conversation.update({
                where: { id: String(conversationId) },
                data: { updatedAt: new Date() },
            }),
        ]);
        return res.status(201).json({ message });
    }
    catch (error) {
        console.error('sendMessage error:', error);
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.sendMessage = sendMessage;
// PATCH /chat/conversations/:conversationId/read
// Mark all messages in a conversation as read for a given user
const markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = getAuthenticatedUser(req).id;
        const conversation = await database_1.prisma.conversation.findUnique({
            where: { id: String(conversationId) },
            select: { mentorId: true, userId: true },
        });
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }
        if (conversation.mentorId !== userId && conversation.userId !== userId) {
            return res.status(403).json({ message: 'You are not part of this conversation' });
        }
        if (!(await (0, mentor_approval_middleware_1.isMentorApproved)(conversation.mentorId))) {
            return res.status(403).json({ message: 'This mentor is not approved for chat' });
        }
        await database_1.prisma.message.updateMany({
            where: {
                conversationId: String(conversationId),
                isRead: false,
                senderId: { not: userId }, // only mark the OTHER person's messages as read
            },
            data: { isRead: true },
        });
        return res.status(200).json({ message: 'Marked as read' });
    }
    catch (error) {
        console.error('markAsRead error:', error);
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.markAsRead = markAsRead;
