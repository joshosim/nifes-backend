"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOwnApprovedMentor = exports.requireMentorApprovalForChat = exports.requireApprovedMentor = exports.requireSelfMentor = void 0;
exports.isMentorApproved = isMentorApproved;
const database_1 = require("../config/database");
async function isMentorApproved(userId) {
    const profile = await database_1.prisma.mentorProfile.findUnique({
        where: { userId },
        select: { verificationStatus: true, isOnboardingComplete: true },
    });
    return (profile?.verificationStatus === 'approved' &&
        profile.isOnboardingComplete);
}
const requireSelfMentor = (req, res, next) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (user.role !== 'MENTOR' || user.id !== String(req.params.userId)) {
        res.status(403).json({ error: 'You can only manage your own mentor application' });
        return;
    }
    next();
};
exports.requireSelfMentor = requireSelfMentor;
const requireApprovedMentor = async (req, res, next) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (user.role !== 'MENTOR' || !(await isMentorApproved(user.id))) {
        res.status(403).json({ error: 'Mentor approval is required for this action' });
        return;
    }
    next();
};
exports.requireApprovedMentor = requireApprovedMentor;
const requireMentorApprovalForChat = async (req, res, next) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (user.role === 'MENTOR' && !(await isMentorApproved(user.id))) {
        res.status(403).json({ error: 'Mentor approval is required to use chat' });
        return;
    }
    if (user.role !== 'MENTOR' && user.role !== 'USER') {
        res.status(403).json({ error: 'Access denied' });
        return;
    }
    next();
};
exports.requireMentorApprovalForChat = requireMentorApprovalForChat;
const requireOwnApprovedMentor = (paramName) => async (req, res, next) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (user.role !== 'MENTOR' ||
        user.id !== String(req.params[paramName]) ||
        !(await isMentorApproved(user.id))) {
        res.status(403).json({ error: 'Approved mentors can only access their own mentees' });
        return;
    }
    next();
};
exports.requireOwnApprovedMentor = requireOwnApprovedMentor;
