import { Request, Response } from 'express';
import { prisma } from '../config/database';

// ─── MENTOR MANAGEMENT ───────────────────────────────────────

export const getPendingMentors = async (req: Request, res: Response) => {
  try {
    const mentors = await prisma.mentorProfile.findMany({
      where: { verificationStatus: 'pending', isOnboardingComplete: true },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });
    return res.status(200).json({ count: mentors.length, data: mentors });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getApprovedMentors = async (req: Request, res: Response) => {
  try {
    const mentors = await prisma.mentorProfile.findMany({
      where: { verificationStatus: 'approved' },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });
    return res.status(200).json({ count: mentors.length, data: mentors });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const approveMentor = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const existing = await prisma.mentorProfile.findUnique({ where: { userId: String(userId) } });
    if (!existing) {
      return res.status(404).json({ message: 'Mentor profile not found' });
    }

    const [mentor] = await prisma.$transaction([
      prisma.mentorProfile.update({
        where: { userId: String(userId) },
        data: { verificationStatus: 'approved' },
      }),
      prisma.user.update({
        where: { id: String(userId) },
        data: { role: 'MENTOR' },
      }),
    ]);

    return res.status(200).json({ message: 'Mentor approved successfully', data: mentor });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const rejectMentor = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const existing = await prisma.mentorProfile.findUnique({ where: { userId: String(userId) } });
    if (!existing) {
      return res.status(404).json({ message: 'Mentor profile not found' });
    }

    const mentor = await prisma.mentorProfile.update({
      where: { userId: String(userId) },
      data: { verificationStatus: 'rejected' },
    });

    return res.status(200).json({ message: 'Mentor rejected', data: mentor });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

// ─── USER MANAGEMENT ─────────────────────────────────────────

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true, name: true, email: true, avatar: true,
        role: true, isVerified: true, nifesZone: true,
        nifesSchool: true, unit: true, wing: true,
        courseOfStudy: true, level: true, createdAt: true,
      },
    });
    return res.status(200).json({ count: users.length, data: users });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getAllMentors = async (req: Request, res: Response) => {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: 'MENTOR' },
      select: {
        id: true, name: true, email: true,
        avatar: true, isVerified: true, createdAt: true,
      },
    });
    return res.status(200).json({ data: mentors });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};
export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true, name: true, email: true,
        avatar: true, isVerified: true, createdAt: true,
      },
    });
    return res.status(200).json({ count: admins.length, data: admins });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const promoteToAdmin = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id: String(userId) },
      data: { role: 'ADMIN' },
      select: { id: true, name: true, email: true, role: true },
    });

    return res.status(200).json({ message: 'User promoted to admin', data: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await prisma.user.delete({ where: { id: String(userId) } });

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

// ─── DASHBOARD STATS ─────────────────────────────────────────

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalMentors, pendingMentors, totalPrograms] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'MENTOR' } }),
      prisma.mentorProfile.count({ where: { verificationStatus: 'pending' } }),
      prisma.program.count(),
    ]);

    return res.status(200).json({
      data: { totalUsers, totalMentors, pendingMentors, totalPrograms },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};
