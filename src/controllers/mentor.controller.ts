import { Request, Response } from 'express';
import { FocusArea } from '@prisma/client';
import { prisma } from '../config/database';

// ─── STEP 1: Verification Details ───────────────────────────
const saveVerificationDetails = async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const { fellowshipPosition, campus } = req.body;

    if (typeof fellowshipPosition !== 'string' || !fellowshipPosition.trim() ||
        typeof campus !== 'string' || !campus.trim()) {
      return res.status(400).json({ message: "Fellowship position and campus are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Verification file is required" });
    }

    // Cloudinary returns the URL on req.file.path
    const verificationFileUrl = req.file.path;

    const existing = await prisma.mentorProfile.findUnique({ where: { userId } });
    if (
      existing?.isOnboardingComplete &&
      existing.verificationStatus !== 'rejected'
    ) {
      return res.status(409).json({ message: "Your completed application cannot be changed while it is under review or approved" });
    }

    const normalizedPosition = fellowshipPosition.trim().toUpperCase().replace(/\s+/g, "_");
    const mentor = await prisma.mentorProfile.upsert({
      where: { userId },
      update: {
        fellowshipPosition: normalizedPosition,
        campus: campus.trim(),
        verificationFileUrl,
        onboardingStep: 2,
        isOnboardingComplete: false,
        verificationStatus: "pending",
      },
      create: {
        userId,
        fellowshipPosition: normalizedPosition,
        campus: campus.trim(),
        verificationFileUrl,
        onboardingStep: 2,
        verificationStatus: "pending",
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
    const userId = String(req.params.userId);
    const { bio, focusArea } = req.body;

    if (typeof bio !== 'string' || !bio.trim() ||
        typeof focusArea !== 'string' || !focusArea.trim()) {
      return res.status(400).json({ message: "Bio and focus area are required" });
    }

    const existing = await prisma.mentorProfile.findUnique({ where: { userId } });
    if (!existing || existing.onboardingStep < 2 || existing.isOnboardingComplete) {
      return res.status(400).json({ message: "Please complete step 1 first" });
    }

    const normalizedFocusArea = focusArea.trim().toUpperCase().replace(/\s+/g, "_");
    const focusAreaAliases: Record<string, FocusArea> = {
      ACADEMICS: FocusArea.ACADEMICS,
      SPIRITUAL: FocusArea.SPIRITUAL,
      SPIRITUAL_GROWTH: FocusArea.SPIRITUAL,
      CAREER: FocusArea.CAREER,
      MENTAL_HEALTH: FocusArea.MENTAL_HEALTH,
      LEADERSHIP: FocusArea.LEADERSHIP,
    };
    const focusAreaValue = focusAreaAliases[normalizedFocusArea];
    if (!focusAreaValue) {
      return res.status(400).json({ message: "Select a valid focus area" });
    }

    // Profile photo is optional (user might skip changing it)
    const profilePhotoUrl = req.file ? req.file.path : existing.profilePhotoUrl;

    const mentor = await prisma.mentorProfile.update({
      where: { userId },
      data: {
        bio: bio.trim(),
        focusArea: focusAreaValue,
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
    const userId = String(req.params.userId);
    const { isAvailable, availableDays, availableTimeStart, availableTimeEnd } = req.body;

    const validDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    if (
      !Array.isArray(availableDays) ||
      availableDays.length === 0 ||
      availableDays.some((day) => typeof day !== 'string' || !validDays.includes(day))
    ) {
      return res.status(400).json({ message: "At least one available day is required" });
    }

    if (
      typeof availableTimeStart !== 'string' ||
      !/^\d{2}:\d{2}$/.test(availableTimeStart) ||
      typeof availableTimeEnd !== 'string' ||
      !/^\d{2}:\d{2}$/.test(availableTimeEnd)
    ) {
      return res.status(400).json({ message: "Available time range is required" });
    }

    const existing = await prisma.mentorProfile.findUnique({ where: { userId } });
    if (!existing || existing.onboardingStep < 3 || existing.isOnboardingComplete) {
      return res.status(400).json({ message: "Please complete previous steps first" });
    }
    if (typeof isAvailable !== 'undefined' && typeof isAvailable !== 'boolean') {
      return res.status(400).json({ message: "Availability must be a boolean" });
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
        verificationStatus: "pending",
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
    const userId = String(req.params.userId);
    const mentor = await prisma.mentorProfile.findUnique({ where: { userId } });

    if (!mentor) {
      return res.status(200).json({
        step: 1,
        isOnboardingComplete: false,
        verificationStatus: null,
        data: null,
      });
    }

    return res.status(200).json({
      step: mentor.onboardingStep,
      isOnboardingComplete: mentor.isOnboardingComplete,
      verificationStatus: mentor.verificationStatus,
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