
import express from "express";
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
import { requireSelfMentor } from "../middleware/mentor-approval.middleware";
import { uploadVerification, uploadProfilePics } from "../config/cloundinary";
const {
  saveVerificationDetails,
  saveProfileSetup,
  saveMentorAvailability,
  getOnboardingStatus,
} = require("../controllers/mentor.controller");

router.get("/:userId/status", authMiddleware, requireSelfMentor, getOnboardingStatus);

router.post(
  "/:userId/verification",
  authMiddleware,
  requireSelfMentor,
  uploadVerification.single("verificationFile"),
  saveVerificationDetails
);

router.post(
  "/:userId/profile-setup",
  authMiddleware,
  requireSelfMentor,
  uploadProfilePics.single("profilePhoto"),
  saveProfileSetup
);

router.post("/:userId/availability", authMiddleware, requireSelfMentor, saveMentorAvailability);

export default router;