"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChatHandlers = void 0;
const database_1 = require("../config/database");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const registerChatHandlers = (io, socket) => {
    // Verify JWT on connection
    const token = socket.handshake.auth?.token;
    let authenticatedUserId = null;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        authenticatedUserId = decoded.id;
    }
    catch {
        socket.emit('error', { message: 'Unauthorized' });
        socket.disconnect();
        return;
    }
    // Client joins a conversation room when they open a chat
    socket.on('join_conversation', (conversationId) => {
        socket.join(conversationId);
        console.log(`Socket ${socket.id} joined room ${conversationId}`);
    });
    socket.on('leave_conversation', (conversationId) => {
        socket.leave(conversationId);
    });
    // Real-time message send
    socket.on('send_message', async (payload) => {
        const { conversationId, content } = payload;
        const senderId = authenticatedUserId; // always use the authenticated user, ignore client-sent senderId
        if (!conversationId || !senderId || !content?.trim()) {
            socket.emit('error', { message: 'Invalid payload' });
            return;
        }
        try {
            const conversation = await database_1.prisma.conversation.findUnique({
                where: { id: conversationId },
            });
            if (!conversation) {
                socket.emit('error', { message: 'Conversation not found' });
                return;
            }
            const isParticipant = conversation.mentorId === senderId || conversation.userId === senderId;
            if (!isParticipant) {
                socket.emit('error', { message: 'Not a participant' });
                return;
            }
            const [message] = await database_1.prisma.$transaction([
                database_1.prisma.message.create({
                    data: { conversationId, senderId, content: content.trim() },
                    include: {
                        sender: { select: { id: true, name: true, avatar: true } },
                    },
                }),
                database_1.prisma.conversation.update({
                    where: { id: conversationId },
                    data: { updatedAt: new Date() },
                }),
            ]);
            // Broadcast to everyone in the room (including sender, so they get the DB id/timestamp)
            io.to(conversationId).emit('new_message', message);
        }
        catch (error) {
            console.error('send_message socket error:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });
    // Typing indicator — lightweight, no DB write
    socket.on('typing', (payload) => {
        const { conversationId, isTyping } = payload;
        const userId = authenticatedUserId;
        // Broadcast to the room EXCEPT the sender
        socket.to(conversationId).emit('typing', { userId, isTyping });
    });
    // Read receipts
    socket.on('read_receipt', async (payload) => {
        const { conversationId } = payload;
        const userId = authenticatedUserId;
        try {
            await database_1.prisma.message.updateMany({
                where: {
                    conversationId,
                    isRead: false,
                    senderId: { not: userId },
                },
                data: { isRead: true },
            });
            // Notify the other person their messages were read
            socket.to(conversationId).emit('messages_read', { conversationId, readBy: userId });
        }
        catch (error) {
            console.error('read_receipt error:', error);
        }
    });
    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
};
exports.registerChatHandlers = registerChatHandlers;
