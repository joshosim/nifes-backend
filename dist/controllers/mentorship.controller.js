"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMenteesByMentor = exports.getMyMentees = exports.respondToRequest = exports.getMentorIncomingRequests = exports.getMenteeRequestStatus = exports.rejectMenteeRequest = void 0;
const database_1 = require("../config/database");
const getUser = (req) => req.user;
const rejectMenteeRequest = (_req, res) => res.status(403).json({ error: 'Mentees cannot initiate mentorship requests.' });
exports.rejectMenteeRequest = rejectMenteeRequest;
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
