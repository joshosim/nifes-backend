"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = exports.getProgramAttendance = exports.getAllPrograms = exports.getProgramQRCode = exports.createProgram = exports.deleteUser = exports.promoteToAdmin = exports.getAllAdmins = exports.getMentorOfUser = exports.getUnassignedUsers = exports.getAssignedUsers = exports.getAllUsers = exports.rejectMentor = exports.approveMentor = exports.getMenteesUnderMentor = exports.getAssignedMentors = exports.getApprovedMentors = exports.getPendingMentors = exports.getAllMentors = void 0;
const database_1 = require("../config/database");
const qrcode_1 = __importDefault(require("qrcode"));
// ─── SHARED FULL SELECTS ─────────────────────────────────────
const fullUserSelect = {
    id: true,
    name: true,
    email: true,
    avatar: true,
    role: true,
    isVerified: true,
    nifesZone: true,
    nifesSchool: true,
    unit: true,
    wing: true,
    courseOfStudy: true,
    level: true,
    authProvider: true,
    createdAt: true,
    updatedAt: true,
};
const fullMentorProfileSelect = {
    id: true,
    fellowshipPosition: true,
    campus: true,
    verificationFileUrl: true,
    verificationStatus: true,
    profilePhotoUrl: true,
    bio: true,
    focusArea: true,
    isAvailable: true,
    availableDays: true,
    availableTimeStart: true,
    availableTimeEnd: true,
    onboardingStep: true,
    isOnboardingComplete: true,
    createdAt: true,
    updatedAt: true,
};
const fullMentorUserSelect = {
    ...fullUserSelect,
    mentorProfile: { select: fullMentorProfileSelect },
};
// ─── MENTOR MANAGEMENT ───────────────────────────────────────
const getAllMentors = async (req, res) => {
    try {
        const mentors = await database_1.prisma.user.findMany({
            where: { role: 'MENTOR' },
            select: fullMentorUserSelect,
        });
        return res.status(200).json({ count: mentors.length, data: mentors });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getAllMentors = getAllMentors;
const getPendingMentors = async (req, res) => {
    try {
        const mentors = await database_1.prisma.mentorProfile.findMany({
            where: { verificationStatus: 'pending', isOnboardingComplete: true },
            select: {
                ...fullMentorProfileSelect,
                user: { select: fullUserSelect },
            },
        });
        return res.status(200).json({ count: mentors.length, data: mentors });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getPendingMentors = getPendingMentors;
const getApprovedMentors = async (req, res) => {
    try {
        const mentors = await database_1.prisma.mentorProfile.findMany({
            where: { verificationStatus: 'approved' },
            select: {
                ...fullMentorProfileSelect,
                user: { select: fullUserSelect },
            },
        });
        return res.status(200).json({ count: mentors.length, data: mentors });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getApprovedMentors = getApprovedMentors;
const getAssignedMentors = async (req, res) => {
    try {
        const mentorIds = await database_1.prisma.mentorshipRequest.findMany({
            where: { status: 'ACCEPTED' },
            select: { mentorId: true },
            distinct: ['mentorId'],
        });
        const ids = mentorIds.map((r) => r.mentorId);
        const mentors = await database_1.prisma.user.findMany({
            where: { id: { in: ids } },
            select: {
                ...fullMentorUserSelect,
                mentorRequests: {
                    where: { status: 'ACCEPTED' },
                    select: {
                        id: true, status: true, createdAt: true,
                        mentee: { select: fullUserSelect },
                    },
                },
            },
        });
        return res.status(200).json({ count: mentors.length, data: mentors });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getAssignedMentors = getAssignedMentors;
const getMenteesUnderMentor = async (req, res) => {
    try {
        const { mentorId } = req.params;
        const mentor = await database_1.prisma.user.findUnique({
            where: { id: String(mentorId) },
            select: {
                ...fullMentorUserSelect,
                mentorRequests: {
                    where: { status: 'ACCEPTED' },
                    select: {
                        id: true, status: true, message: true, createdAt: true,
                        mentee: { select: fullUserSelect },
                    },
                },
            },
        });
        if (!mentor)
            return res.status(404).json({ message: 'Mentor not found' });
        const mentees = mentor.mentorRequests.map((r) => r.mentee);
        return res.status(200).json({
            mentor: { ...mentor, mentorRequests: undefined },
            count: mentees.length,
            mentees,
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getMenteesUnderMentor = getMenteesUnderMentor;
const approveMentor = async (req, res) => {
    try {
        const { userId } = req.params;
        const existing = await database_1.prisma.mentorProfile.findUnique({ where: { userId: String(userId) } });
        if (!existing)
            return res.status(404).json({ message: 'Mentor profile not found' });
        const [mentor] = await database_1.prisma.$transaction([
            database_1.prisma.mentorProfile.update({
                where: { userId: String(userId) },
                data: { verificationStatus: 'approved' },
            }),
            database_1.prisma.user.update({
                where: { id: String(userId) },
                data: { role: 'MENTOR' },
            }),
        ]);
        await database_1.prisma.notification.create({
            data: {
                userId: String(userId),
                title: 'Mentor Application Approved',
                body: 'Congratulations! Your mentor application has been approved.',
            },
        });
        return res.status(200).json({ message: 'Mentor approved successfully', data: mentor });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.approveMentor = approveMentor;
const rejectMentor = async (req, res) => {
    try {
        const { userId } = req.params;
        const existing = await database_1.prisma.mentorProfile.findUnique({ where: { userId: String(userId) } });
        if (!existing)
            return res.status(404).json({ message: 'Mentor profile not found' });
        const mentor = await database_1.prisma.mentorProfile.update({
            where: { userId: String(userId) },
            data: { verificationStatus: 'rejected' },
        });
        await database_1.prisma.notification.create({
            data: {
                userId: String(userId),
                title: 'Mentor Application Rejected',
                body: 'Unfortunately, your mentor application was not approved at this time.',
            },
        });
        return res.status(200).json({ message: 'Mentor rejected', data: mentor });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.rejectMentor = rejectMentor;
// ─── USER (MENTEE) MANAGEMENT ────────────────────────────────
const getAllUsers = async (req, res) => {
    try {
        const users = await database_1.prisma.user.findMany({
            where: { role: 'USER' },
            select: fullUserSelect,
        });
        return res.status(200).json({ count: users.length, data: users });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getAllUsers = getAllUsers;
const getAssignedUsers = async (req, res) => {
    try {
        const assigned = await database_1.prisma.mentorshipRequest.findMany({
            where: { status: 'ACCEPTED' },
            select: {
                id: true, status: true, message: true, createdAt: true,
                mentee: { select: fullUserSelect },
                mentor: { select: fullMentorUserSelect },
            },
        });
        return res.status(200).json({
            count: assigned.length,
            data: assigned.map((r) => ({ ...r.mentee, assignedMentor: r.mentor })),
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getAssignedUsers = getAssignedUsers;
const getUnassignedUsers = async (req, res) => {
    try {
        const assignedMenteeIds = await database_1.prisma.mentorshipRequest.findMany({
            where: { status: 'ACCEPTED' },
            select: { menteeId: true },
            distinct: ['menteeId'],
        });
        const ids = assignedMenteeIds.map((r) => r.menteeId);
        const users = await database_1.prisma.user.findMany({
            where: { role: 'USER', id: { notIn: ids } },
            select: fullUserSelect,
        });
        return res.status(200).json({ count: users.length, data: users });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getUnassignedUsers = getUnassignedUsers;
const getMentorOfUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await database_1.prisma.user.findUnique({
            where: { id: String(userId) },
            select: {
                ...fullUserSelect,
                menteeRequests: {
                    where: { status: 'ACCEPTED' },
                    select: {
                        id: true, status: true, message: true, createdAt: true,
                        mentor: { select: fullMentorUserSelect },
                    },
                },
            },
        });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const request = user.menteeRequests[0];
        return res.status(200).json({
            user: { ...user, menteeRequests: undefined },
            mentor: request ? request.mentor : null,
            assignedSince: request ? request.createdAt : null,
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getMentorOfUser = getMentorOfUser;
// ─── ADMIN MANAGEMENT ────────────────────────────────────────
const getAllAdmins = async (req, res) => {
    try {
        const admins = await database_1.prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: fullUserSelect,
        });
        return res.status(200).json({ count: admins.length, data: admins });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getAllAdmins = getAllAdmins;
const promoteToAdmin = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await database_1.prisma.user.findUnique({ where: { id: String(userId) } });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const updated = await database_1.prisma.user.update({
            where: { id: String(userId) },
            data: { role: 'ADMIN' },
            select: fullUserSelect,
        });
        return res.status(200).json({ message: 'User promoted to admin', data: updated });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.promoteToAdmin = promoteToAdmin;
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await database_1.prisma.user.findUnique({ where: { id: String(userId) } });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        await database_1.prisma.user.delete({ where: { id: String(userId) } });
        return res.status(200).json({ message: 'User deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.deleteUser = deleteUser;
// ─── PROGRAMS & QR CODE ──────────────────────────────────────
const createProgram = async (req, res) => {
    try {
        const { title, type, description, startTime, endTime } = req.body;
        if (!title || !type || !startTime || !endTime) {
            return res.status(400).json({ error: 'title, type, startTime and endTime are required' });
        }
        const program = await database_1.prisma.program.create({
            data: {
                title, type, description,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                createdBy: req.user.id,
            },
        });
        const qrPayload = JSON.stringify({ type: 'program-attendance', programId: program.id });
        const qrCodeDataUrl = await qrcode_1.default.toDataURL(qrPayload);
        return res.status(201).json({
            message: 'Program created successfully',
            data: program,
            qrCode: qrCodeDataUrl,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to create program', details: error });
    }
};
exports.createProgram = createProgram;
const getProgramQRCode = async (req, res) => {
    try {
        const { programId } = req.params;
        const program = await database_1.prisma.program.findUnique({ where: { id: String(programId) } });
        if (!program)
            return res.status(404).json({ error: 'Program not found' });
        const qrPayload = JSON.stringify({ type: 'program-attendance', programId: program.id });
        const qrCodeDataUrl = await qrcode_1.default.toDataURL(qrPayload);
        return res.status(200).json({
            programId: program.id,
            title: program.title,
            qrCode: qrCodeDataUrl,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to generate QR code', details: error });
    }
};
exports.getProgramQRCode = getProgramQRCode;
const getAllPrograms = async (req, res) => {
    try {
        const programs = await database_1.prisma.program.findMany({
            orderBy: { startTime: 'desc' },
            include: { _count: { select: { attendances: true } } },
        });
        return res.status(200).json({ count: programs.length, data: programs });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch programs', details: error });
    }
};
exports.getAllPrograms = getAllPrograms;
const getProgramAttendance = async (req, res) => {
    try {
        const { programId } = req.params;
        const attendances = await database_1.prisma.attendance.findMany({
            where: { programId: String(programId) },
            include: { user: { select: fullUserSelect } },
        });
        return res.status(200).json({ count: attendances.length, data: attendances });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch attendance', details: error });
    }
};
exports.getProgramAttendance = getProgramAttendance;
// ─── DASHBOARD STATS ─────────────────────────────────────────
const getDashboardStats = async (req, res) => {
    try {
        const [totalUsers, totalMentors, pendingMentors, approvedMentors, totalPrograms, activeSessions, assignedMenteeIds, assignedMentorIds,] = await Promise.all([
            database_1.prisma.user.count({ where: { role: 'USER' } }),
            database_1.prisma.user.count({ where: { role: 'MENTOR' } }),
            database_1.prisma.mentorProfile.count({ where: { verificationStatus: 'pending', isOnboardingComplete: true } }),
            database_1.prisma.mentorProfile.count({ where: { verificationStatus: 'approved' } }),
            database_1.prisma.adminConference.count(),
            database_1.prisma.recordedSession.count({ where: { status: 'published' } }),
            database_1.prisma.mentorshipRequest.findMany({ where: { status: 'ACCEPTED' }, select: { menteeId: true }, distinct: ['menteeId'] }),
            database_1.prisma.mentorshipRequest.findMany({ where: { status: 'ACCEPTED' }, select: { mentorId: true }, distinct: ['mentorId'] }),
        ]);
        return res.status(200).json({
            totalMentors,
            totalUsers,
            totalMentees: totalUsers,
            totalPrograms,
            activeSessions,
            pendingMentors,
            pendingApprovals: pendingMentors,
            data: {
                totalUsers,
                totalMentees: totalUsers,
                totalMentors,
                pendingMentors,
                pendingApprovals: pendingMentors,
                approvedMentors,
                activeSessions,
                assignedMentors: assignedMentorIds.length,
                assignedMentees: assignedMenteeIds.length,
                unassignedMentees: totalUsers - assignedMenteeIds.length,
                totalPrograms,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};
exports.getDashboardStats = getDashboardStats;
