"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const { authMiddleware } = require('../middleware/auth.middleware');
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(authMiddleware, (0, role_middleware_1.requireRole)('ADMIN'));
// ─── STATS ───────────────────────────────────────────────────
router.get('/stats', admin_controller_1.getDashboardStats);
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
