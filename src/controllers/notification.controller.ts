import { Request, Response } from 'express';
import { prisma } from '../config/database';

const getUser = (req: Request) => (req as any).user as { id: string; email: string; role: string };

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = getUser(req).id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ notifications });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const userId = getUser(req).id;
    const id = String(req.params.id);

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
    return res.json({ notification: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error });
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    const userId = getUser(req).id;
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error });
  }
};
