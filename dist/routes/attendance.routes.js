"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_controller_1 = require("../controllers/attendance.controller");
const { authMiddleware } = require('../middleware/auth.middleware');
const router = (0, express_1.Router)();
// Any authenticated user scans a QR code to mark their attendance
router.post('/mark', authMiddleware, attendance_controller_1.markAttendance);
exports.default = router;
