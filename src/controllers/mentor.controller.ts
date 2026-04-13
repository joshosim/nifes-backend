const { PrismaClient } = require("@prisma/client");
import { Request, Response } from 'express';
const prisma = new PrismaClient();

// ─── STEP 1: Verification Details ───────────────────────────
const saveVerificationDetails = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { fellowshipPosition, campus } = req.body;

    if (!fellowshipPosition || !campus) {
      return res.status(400).json({ message: "Fellowship position and campus are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Verification file is required" });
    }

    // Cloudinary returns the URL on req.file.path
    const verificationFileUrl = req.file.path;

    const mentor = await prisma.mentorProfile.upsert({
      where: { userId },
      update: {
        fellowshipPosition: fellowshipPosition.toUpperCase().replace(" ", "_"),
        campus,
        verificationFileUrl,
        onboardingStep: 2,
      },
      create: {
        userId,
        fellowshipPosition: fellowshipPosition.toUpperCase().replace(" ", "_"),
        campus,
        verificationFileUrl,
        onboardingStep: 2,
      },
    });

    return res.status(200).json({
      message: "Verification details saved",
      step: 2,
      data: mentor,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error: error });
  }
};

// ─── STEP 2: Profile Setup ───────────────────────────────────
const saveProfileSetup = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { bio, focusArea } = req.body;

    if (!bio || !focusArea) {
      return res.status(400).json({ message: "Bio and focus area are required" });
    }

    const existing = await prisma.mentorProfile.findUnique({ where: { userId } });
    if (!existing || existing.onboardingStep < 2) {
      return res.status(400).json({ message: "Please complete step 1 first" });
    }

    // Profile photo is optional (user might skip changing it)
    const profilePhotoUrl = req.file ? req.file.path : existing.profilePhotoUrl;

    const mentor = await prisma.mentorProfile.update({
      where: { userId },
      data: {
        bio,
        focusArea: focusArea,
        profilePhotoUrl,
        onboardingStep: 3,
      },
    });

    return res.status(200).json({
      message: "Profile setup saved",
      step: 3,
      data: mentor,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error: error });
  }
};

// ─── STEP 3: Mentor Availability ─────────────────────────────
const saveMentorAvailability = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { isAvailable, availableDays, availableTimeStart, availableTimeEnd } = req.body;

    if (!availableDays || !Array.isArray(availableDays) || availableDays.length === 0) {
      return res.status(400).json({ message: "At least one available day is required" });
    }

    if (!availableTimeStart || !availableTimeEnd) {
      return res.status(400).json({ message: "Available time range is required" });
    }

    const existing = await prisma.mentorProfile.findUnique({ where: { userId } });
    if (!existing || existing.onboardingStep < 3) {
      return res.status(400).json({ message: "Please complete previous steps first" });
    }

    const mentor = await prisma.mentorProfile.update({
      where: { userId },
      data: {
        isAvailable: isAvailable ?? true,
        availableDays,
        availableTimeStart,
        availableTimeEnd,
        onboardingStep: 4,
        isOnboardingComplete: true,
      },
    });

    return res.status(200).json({
      message: "Mentor onboarding complete! Application submitted.",
      data: mentor,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error: error });
  }
};

// ─── GET: Onboarding Status ───────────────────────────────────
const getOnboardingStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const mentor = await prisma.mentorProfile.findUnique({ where: { userId } });

    if (!mentor) {
      return res.status(200).json({ step: 1, isOnboardingComplete: false, data: null });
    }

    return res.status(200).json({
      step: mentor.onboardingStep,
      isOnboardingComplete: mentor.isOnboardingComplete,
      data: mentor,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error });
  }
};

module.exports = {
  saveVerificationDetails,
  saveProfileSetup,
  saveMentorAvailability,
  getOnboardingStatus,
};