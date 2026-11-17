"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const mentor_approval_middleware_1 = require("../middleware/mentor-approval.middleware");
const cloundinary_1 = require("../config/cloundinary");
const { saveVerificationDetails, saveProfileSetup, saveMentorAvailability, getOnboardingStatus, } = require("../controllers/mentor.controller");
const handleVerificationUploadError = (error, _req, res, next) => {
    if (error instanceof multer_1.default.MulterError && error.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ message: "Verification file must be 10 MB or smaller" });
        return;
    }
    next(error);
};
router.get("/:userId/status", authMiddleware, mentor_approval_middleware_1.requireSelfMentor, getOnboardingStatus);
router.post("/:userId/verification", authMiddleware, mentor_approval_middleware_1.requireSelfMentor, cloundinary_1.uploadVerification.single("verificationFile"), handleVerificationUploadError, saveVerificationDetails);
router.post("/:userId/profile-setup", authMiddleware, mentor_approval_middleware_1.requireSelfMentor, cloundinary_1.uploadProfilePics.single("profilePhoto"), saveProfileSetup);
router.post("/:userId/availability", authMiddleware, mentor_approval_middleware_1.requireSelfMentor, saveMentorAvailability);
exports.default = router;
