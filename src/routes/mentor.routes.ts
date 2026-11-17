
import express from "express";
import multer from "multer";
import { ErrorRequestHandler } from "express";
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

const handleVerificationUploadError: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ message: "Verification file must be 10 MB or smaller" });
    return;
  }
  next(error);
};

router.get("/:userId/status", authMiddleware, requireSelfMentor, getOnboardingStatus);

router.post(
  "/:userId/verification",
  authMiddleware,
  requireSelfMentor,
  uploadVerification.single("verificationFile"),
  handleVerificationUploadError,
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