import { Request, Response } from 'express';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

export const approveMentor = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const mentor = await prisma.mentorProfile.update({
      where: { userId },
      data: { verificationStatus: 'approved' },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { role: 'MENTOR' },
    });

    return res.status(200).json({ message: 'Mentor approved successfully', data: mentor });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const rejectMentor = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const mentor = await prisma.mentorProfile.update({
      where: { userId },
      data: { verificationStatus: 'rejected' },
    });

    return res.status(200).json({ message: 'Mentor rejected', data: mentor });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getPendingMentors = async (req: Request, res: Response) => {
  try {
    const mentors = await prisma.mentorProfile.findMany({
      where: { verificationStatus: 'pending', isOnboardingComplete: true },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return res.status(200).json({ data: mentors });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};
