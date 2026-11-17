"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMenteesByMentor = exports.getMyMentees = exports.respondToRequest = exports.getMentorIncomingRequests = exports.getMenteeRequestStatus = exports.sendRequest = void 0;
const database_1 = require("../config/database");
const mentor_approval_middleware_1 = require("../middleware/mentor-approval.middleware");
const getUser = (req) => req.user;
const sendRequest = async (req, res) => {
    try {
        const user = getUser(req);
        if (user.role !== 'USER') {
            return res.status(403).json({ error: 'Only mentees can request a mentor' });
        }
        const menteeId = user.id;
        const mentorId = String(req.params.mentorId);
        const { message } = req.body;
        const mentor = await database_1.prisma.user.findUnique({ where: { id: mentorId } });
        if (!mentor || mentor.role !== 'MENTOR') {
            return res.status(404).json({ error: 'Mentor not found' });
        }
        if (!(await (0, mentor_approval_middleware_1.isMentorApproved)(mentorId))) {
            return res.status(403).json({ error: 'This mentor is not approved yet' });
        }
        if (menteeId === mentorId) {
            return res.status(400).json({ error: 'You cannot request yourself' });
        }
        const existing = await database_1.prisma.mentorshipRequest.findUnique({
            where: { menteeId_mentorId: { menteeId, mentorId } },
        });
        if (existing) {
            return res.status(409).json({ error: 'Request already sent', status: existing.status });
        }
        const mentee = await database_1.prisma.user.findUnique({ where: { id: menteeId }, select: { name: true } });
        const request = await database_1.prisma.mentorshipRequest.create({ data: { menteeId, mentorId, message } });
        await database_1.prisma.notification.create({
            data: {
                userId: mentorId,
                title: 'New Mentorship Request',
                body: `${mentee.name} has requested you as a mentor.`,
            },
        });
        return res.status(201).json({ message: 'Request sent', data: request });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.sendRequest = sendRequest;
const getMenteeRequestStatus = async (req, res) => {
    try {
        const menteeId = getUser(req).id;
        const requests = await database_1.prisma.mentorshipRequest.findMany({
            where: { menteeId },
            include: {
                mentor: {
                    select: {
                        id: true, name: true, avatar: true,
                        mentorProfile: { select: { profilePhotoUrl: true, bio: true, focusArea: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ requests });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.getMenteeRequestStatus = getMenteeRequestStatus;
const getMentorIncomingRequests = async (req, res) => {
    try {
        const mentorId = getUser(req).id;
        const requests = await database_1.prisma.mentorshipRequest.findMany({
            where: { mentorId },
            include: {
                mentee: {
                    select: { id: true, name: true, avatar: true, nifesSchool: true, courseOfStudy: true, level: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ requests });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.getMentorIncomingRequests = getMentorIncomingRequests;
const respondToRequest = async (req, res) => {
    try {
        const mentorId = getUser(req).id;
        const requestId = String(req.params.requestId);
        const { action } = req.body;
        if (!['accept', 'decline'].includes(action)) {
            return res.status(400).json({ error: 'Action must be "accept" or "decline"' });
        }
        const request = await database_1.prisma.mentorshipRequest.findUnique({ where: { id: requestId } });
        if (!request || request.mentorId !== mentorId) {
            return res.status(404).json({ error: 'Request not found' });
        }
        if (request.status !== 'PENDING') {
            return res.status(400).json({ error: 'Request already responded to' });
        }
        const newStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
        const mentor = await database_1.prisma.user.findUnique({ where: { id: mentorId }, select: { name: true } });
        const updated = await database_1.prisma.mentorshipRequest.update({
            where: { id: requestId },
            data: { status: newStatus },
        });
        await database_1.prisma.notification.create({
            data: {
                userId: request.menteeId,
                title: `Mentorship Request ${newStatus === 'ACCEPTED' ? 'Accepted' : 'Declined'}`,
                body: `${mentor.name} has ${newStatus === 'ACCEPTED' ? 'accepted' : 'declined'} your mentorship request.`,
            },
        });
        return res.json({ message: `Request ${newStatus.toLowerCase()}`, data: updated });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.respondToRequest = respondToRequest;
const getMyMentees = async (req, res) => {
    try {
        const mentorId = getUser(req).id;
        const accepted = await database_1.prisma.mentorshipRequest.findMany({
            where: { mentorId, status: 'ACCEPTED' },
            include: {
                mentee: {
                    select: { id: true, name: true, avatar: true, email: true, nifesSchool: true, courseOfStudy: true, level: true },
                },
            },
        });
        return res.json({ mentees: accepted.map((r) => r.mentee) });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.getMyMentees = getMyMentees;
const getMenteesByMentor = async (req, res) => {
    try {
        const mentorId = String(req.params.mentorId);
        const accepted = await database_1.prisma.mentorshipRequest.findMany({
            where: { mentorId, status: 'ACCEPTED' },
            include: {
                mentee: {
                    select: { id: true, name: true, avatar: true, nifesSchool: true, courseOfStudy: true, level: true },
                },
            },
        });
        return res.json({ mentees: accepted.map((r) => r.mentee) });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.getMenteesByMentor = getMenteesByMentor;
