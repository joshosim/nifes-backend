import { Request, Response } from 'express';
import { prisma } from '../config/database';

// GET /chat/conversations/:userId
// Returns all conversations for a user (as mentor or mentee), latest message first
export const getConversations = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ mentorId: String(userId) }, { userId: String(userId) }],
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
    const withUnread = await Promise.all(
      conversations.map(async (convo) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: convo.id,
            isRead: false,
            senderId: { not: String(userId) }, // messages sent TO this user
          },
        });
        return { ...convo, unreadCount };
      })
    );

    return res.status(200).json({ conversations: withUnread });
  } catch (error) {
    console.error('getConversations error:', error);
    return res.status(500).json({ message: 'Server error', error });
  }
};

// GET /chat/conversations/:conversationId/messages?cursor=<messageId>&limit=20
// Paginated message history — cursor-based so Flutter can load older messages
export const getMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { cursor, limit = '20' } = req.query;
    const take = Math.min(Number(limit), 50); // cap at 50

    const messages = await prisma.message.findMany({
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
  } catch (error) {
    console.error('getMessages error:', error);
    return res.status(500).json({ message: 'Server error', error });
  }
};

// POST /chat/conversations
// Creates or returns the existing conversation between mentor and mentee
export const getOrCreateConversation = async (req: Request, res: Response) => {
  try {
    const { mentorId, userId } = req.body;

    if (!mentorId || !userId) {
      return res.status(400).json({ message: 'mentorId and userId are required' });
    }

    if (mentorId === userId) {
      return res.status(400).json({ message: 'Mentor and user cannot be the same person' });
    }

    // Verify both users exist and mentor has the right role
    const [mentor, user] = await Promise.all([
      prisma.user.findUnique({ where: { id: mentorId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!mentor || mentor.role !== 'MENTOR') {
      return res.status(404).json({ message: 'Mentor not found' });
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const conversation = await prisma.conversation.upsert({
      where: { mentorId_userId: { mentorId, userId } },
      update: {}, // already exists, just return it
      create: { mentorId, userId },
      include: {
        mentor: { select: { id: true, name: true, avatar: true } },
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    return res.status(200).json({ conversation });
  } catch (error) {
    console.error('getOrCreateConversation error:', error);
    return res.status(500).json({ message: 'Server error', error });
  }
};

// POST /chat/conversations/:conversationId/messages
// REST fallback for sending a message (when socket isn't connected)
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { senderId, content } = req.body;

    if (!senderId || !content?.trim()) {
      return res.status(400).json({ message: 'senderId and content are required' });
    }

    // Verify sender belongs to this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: String(conversationId) },
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const isParticipant =
      conversation.mentorId === senderId || conversation.userId === senderId;

    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not part of this conversation' });
    }

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId: String(conversationId), senderId, content: content.trim() },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
        },
      }),
      // Bump conversation updatedAt so it sorts to top of list
      prisma.conversation.update({
        where: { id: String(conversationId) },
        data: { updatedAt: new Date() },
      }),
    ]);

    return res.status(201).json({ message });
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({ message: 'Server error', error });
  }
};

// PATCH /chat/conversations/:conversationId/read
// Mark all messages in a conversation as read for a given user
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    await prisma.message.updateMany({
      where: {
        conversationId: String(conversationId),
        isRead: false,
        senderId: { not: userId }, // only mark the OTHER person's messages as read
      },
      data: { isRead: true },
    });

    return res.status(200).json({ message: 'Marked as read' });
  } catch (error) {
    console.error('markAsRead error:', error);
    return res.status(500).json({ message: 'Server error', error });
  }
};