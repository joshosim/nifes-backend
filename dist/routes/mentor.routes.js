"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const mentor_approval_middleware_1 = require("../middleware/mentor-approval.middleware");
const cloundinary_1 = require("../config/cloundinary");
const { saveVerificationDetails, saveProfileSetup, saveMentorAvailability, getOnboardingStatus, } = require("../controllers/mentor.controller");
router.get("/:userId/status", authMiddleware, mentor_approval_middleware_1.requireSelfMentor, getOnboardingStatus);
router.post("/:userId/verification", authMiddleware, mentor_approval_middleware_1.requireSelfMentor, cloundinary_1.uploadVerification.single("verificationFile"), saveVerificationDetails);
router.post("/:userId/profile-setup", authMiddleware, mentor_approval_middleware_1.requireSelfMentor, cloundinary_1.uploadProfilePics.single("profilePhoto"), saveProfileSetup);
router.post("/:userId/availability", authMiddleware, mentor_approval_middleware_1.requireSelfMentor, saveMentorAvailability);
exports.default = router;
