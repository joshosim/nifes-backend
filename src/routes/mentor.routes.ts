
import express from "express";
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
import { uploadVerification, uploadProfilePics } from "../config/cloundinary";
const {
  saveVerificationDetails,
  saveProfileSetup,
  saveMentorAvailability,
  getOnboardingStatus,
} = require("../controllers/mentor.controller");

router.get("/:userId/status", authMiddleware, getOnboardingStatus);

router.post(
  "/:userId/verification",
  authMiddleware,
  uploadVerification.single("verificationFile"),
  saveVerificationDetails
);

router.post(
  "/:userId/profile-setup",
  authMiddleware,
  uploadProfilePics.single("profilePhoto"),
  saveProfileSetup
);

router.post("/:userId/availability", authMiddleware, saveMentorAvailability);

export default router;