"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const cloundinary_1 = require("../config/cloundinary");
const { saveVerificationDetails, saveProfileSetup, saveMentorAvailability, getOnboardingStatus, } = require("../controllers/mentor.controller");
router.get("/:userId/status", authMiddleware, getOnboardingStatus);
router.post("/:userId/verification", authMiddleware, cloundinary_1.uploadVerification.single("verificationFile"), saveVerificationDetails);
router.post("/:userId/profile-setup", authMiddleware, cloundinary_1.uploadProfilePics.single("profilePhoto"), saveProfileSetup);
router.post("/:userId/availability", authMiddleware, saveMentorAvailability);
exports.default = router;
