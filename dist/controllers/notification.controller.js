"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsRead = exports.markNotificationRead = exports.getNotifications = void 0;
const database_1 = require("../config/database");
const getUser = (req) => req.user;
const getNotifications = async (req, res) => {
    try {
        const userId = getUser(req).id;
        const notifications = await database_1.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ notifications });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.getNotifications = getNotifications;
const markNotificationRead = async (req, res) => {
    try {
        const userId = getUser(req).id;
        const id = String(req.params.id);
        const notification = await database_1.prisma.notification.findUnique({ where: { id } });
        if (!notification || notification.userId !== userId) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        const updated = await database_1.prisma.notification.update({ where: { id }, data: { isRead: true } });
        return res.json({ notification: updated });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (req, res) => {
    try {
        const userId = getUser(req).id;
        await database_1.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
        return res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.markAllNotificationsRead = markAllNotificationsRead;
