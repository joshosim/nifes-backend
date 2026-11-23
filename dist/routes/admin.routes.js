"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const admin_api_controller_1 = require("../controllers/admin.api.controller");
const cloundinary_1 = require("../config/cloundinary");
const { authMiddleware } = require('../middleware/auth.middleware');
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(authMiddleware, (0, role_middleware_1.requireRole)('ADMIN'));
// ─── STATS ───────────────────────────────────────────────────
router.get('/stats', admin_controller_1.getDashboardStats);
// Admin dashboard contract
router.get('/mentors', admin_api_controller_1.getMentorTable);
router.get('/mentors/pending', (0, admin_api_controller_1.getMentorTableByStatus)('pending'));
router.get('/mentors/approved', (0, admin_api_controller_1.getMentorTableByStatus)('approved'));
router.get('/mentors/rejected', (0, admin_api_controller_1.getMentorTableByStatus)('rejected'));
router.post('/mentors', admin_api_controller_1.addMentor);
router.get('/users', admin_api_controller_1.getAdminUsers);
router.get('/users/assigned', (0, admin_api_controller_1.getUsersByAssignment)(true));
router.get('/users/unassigned', (0, admin_api_controller_1.getUsersByAssignment)(false));
// Conference and small group management
router.get('/programs/archived', admin_api_controller_1.getConferenceList);
router.get('/programs', admin_api_controller_1.getConferenceList);
router.post('/programs', admin_api_controller_1.createConference);
router.get('/programs/:id', admin_api_controller_1.conferenceDetail);
router.patch('/programs/:id/archive', admin_api_controller_1.archiveConference);
router.patch('/programs/:id/publish', admin_api_controller_1.publishConference);
router.get('/programs/:id/mentors', (0, admin_api_controller_1.conferencePeople)('mentors'));
router.get('/programs/:id/mentees', (0, admin_api_controller_1.conferencePeople)('mentees'));
router.get('/programs/:id/groups', admin_api_controller_1.getGroups);
router.post('/programs/:id/groups', admin_api_controller_1.createGroup);
router.patch('/programs/:id/groups/:groupId', admin_api_controller_1.updateGroup);
router.post('/programs/:id/random-assign', admin_api_controller_1.randomAssign);
router.post('/programs/:id/confirm-assignments', admin_api_controller_1.confirmAssignments);
router.get('/programs/:id/report', admin_api_controller_1.conferenceReport);
// Recorded teaching library
router.get('/sessions', admin_api_controller_1.getRecordedSessions);
router.post('/sessions', admin_api_controller_1.createRecordedSession);
router.get('/sessions/:id', async (req, res, next) => {
    try {
        const { prisma } = require('../config/database');
        const session = await prisma.recordedSession.findUnique({ where: { id: req.params.id }, include: { mentor: { select: { name: true } } } });
        if (!session)
            return res.status(404).json({ message: 'Session not found' });
        return res.json({ session: { ...session, mentorName: session.mentor?.name ?? null } });
    }
    catch (error) {
        return next(error);
    }
});
router.patch('/sessions/:id', admin_api_controller_1.updateRecordedSession);
router.delete('/sessions/:id', admin_api_controller_1.deleteRecordedSession);
router.patch('/sessions/:id/publish', admin_api_controller_1.publishRecordedSession);
router.post('/sessions/:id/thumbnail', cloundinary_1.uploadProfilePics.single('file'), (0, admin_api_controller_1.setSessionAsset)('thumbnailUrl'));
router.post('/sessions/:id/media', cloundinary_1.uploadTeachingMedia.single('file'), (0, admin_api_controller_1.setSessionAsset)('mediaUrl'));
// Admin account settings
router.get('/profile', admin_api_controller_1.getAdminProfile);
router.patch('/profile', admin_api_controller_1.updateAdminProfile);
router.patch('/profile/password', admin_api_controller_1.updateAdminPassword);
router.patch('/profile/notifications', admin_api_controller_1.updateAdminNotifications);
// ─── MENTOR MANAGEMENT ───────────────────────────────────────
router.get('/mentors', admin_controller_1.getAllMentors);
router.get('/mentors/pending', admin_controller_1.getPendingMentors);
router.get('/mentors/approved', admin_controller_1.getApprovedMentors);
router.get('/mentors/assigned', admin_controller_1.getAssignedMentors);
router.get('/mentors/:mentorId/mentees', admin_controller_1.getMenteesUnderMentor);
router.patch('/mentors/:userId/approve', admin_controller_1.approveMentor);
router.patch('/mentors/:userId/reject', admin_controller_1.rejectMentor);
// ─── USER MANAGEMENT ─────────────────────────────────────────
router.get('/users', admin_controller_1.getAllUsers);
router.get('/users/assigned', admin_controller_1.getAssignedUsers);
router.get('/users/unassigned', admin_controller_1.getUnassignedUsers);
router.get('/users/:userId/mentor', admin_controller_1.getMentorOfUser);
router.delete('/users/:userId', admin_controller_1.deleteUser);
// ─── ADMIN MANAGEMENT ────────────────────────────────────────
router.get('/admins', admin_controller_1.getAllAdmins);
router.patch('/users/:userId/promote', admin_controller_1.promoteToAdmin);
// ─── PROGRAMS & ATTENDANCE ───────────────────────────────────
router.post('/programs', admin_controller_1.createProgram);
router.get('/programs', admin_controller_1.getAllPrograms);
router.get('/programs/:programId/qr', admin_controller_1.getProgramQRCode);
router.get('/programs/:programId/attendance', admin_controller_1.getProgramAttendance);
exports.default = router;
