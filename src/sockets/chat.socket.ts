import { Server, Socket } from 'socket.io';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';

interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  content: string;
}

interface TypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

interface ReadReceiptPayload {
  conversationId: string;
  userId: string;
}

export const registerChatHandlers = (io: Server, socket: Socket) => {
  // Verify JWT on connection
  const token = socket.handshake.auth?.token;
  let authenticatedUserId: string | null = null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    authenticatedUserId = decoded.id;
  } catch {
    socket.emit('error', { message: 'Unauthorized' });
    socket.disconnect();
    return;
  }

  // Client joins a conversation room when they open a chat
  socket.on('join_conversation', (conversationId: string) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined room ${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(conversationId);
  });

  // Real-time message send
  socket.on('send_message', async (payload: SendMessagePayload) => {
    const { conversationId, content } = payload;
    const senderId = authenticatedUserId!; // always use the authenticated user, ignore client-sent senderId

    if (!conversationId || !senderId || !content?.trim()) {
      socket.emit('error', { message: 'Invalid payload' });
      return;
    }

    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }

      const isParticipant =
        conversation.mentorId === senderId || conversation.userId === senderId;

      if (!isParticipant) {
        socket.emit('error', { message: 'Not a participant' });
        return;
      }

      const [message] = await prisma.$transaction([
        prisma.message.create({
          data: { conversationId, senderId, content: content.trim() },
          include: {
            sender: { select: { id: true, name: true, avatar: true } },
          },
        }),
        prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        }),
      ]);

      // Broadcast to everyone in the room (including sender, so they get the DB id/timestamp)
      io.to(conversationId).emit('new_message', message);
    } catch (error) {
      console.error('send_message socket error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator — lightweight, no DB write
  socket.on('typing', (payload: TypingPayload) => {
    const { conversationId, isTyping } = payload;
    const userId = authenticatedUserId!;
    // Broadcast to the room EXCEPT the sender
    socket.to(conversationId).emit('typing', { userId, isTyping });
  });

  // Read receipts
  socket.on('read_receipt', async (payload: ReadReceiptPayload) => {
    const { conversationId } = payload;
    const userId = authenticatedUserId!;

    try {
      await prisma.message.updateMany({
        where: {
          conversationId,
          isRead: false,
          senderId: { not: userId },
        },
        data: { isRead: true },
      });

      // Notify the other person their messages were read
      socket.to(conversationId).emit('messages_read', { conversationId, readBy: userId });
    } catch (error) {
      console.error('read_receipt error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
};