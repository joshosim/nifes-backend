import { Request, Response } from 'express';
import { prisma } from '../config/database';
import QRCode from 'qrcode';

// ─── SHARED FULL SELECTS ─────────────────────────────────────

const fullUserSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  role: true,
  isVerified: true,
  nifesZone: true,
  nifesSchool: true,
  unit: true,
  wing: true,
  courseOfStudy: true,
  level: true,
  authProvider: true,
  createdAt: true,
  updatedAt: true,
};

const fullMentorProfileSelect = {
  id: true,
  fellowshipPosition: true,
  campus: true,
  verificationFileUrl: true,
  verificationStatus: true,
  profilePhotoUrl: true,
  bio: true,
  focusArea: true,
  isAvailable: true,
  availableDays: true,
  availableTimeStart: true,
  availableTimeEnd: true,
  onboardingStep: true,
  isOnboardingComplete: true,
  createdAt: true,
  updatedAt: true,
};

const fullMentorUserSelect = {
  ...fullUserSelect,
  mentorProfile: { select: fullMentorProfileSelect },
};

// ─── MENTOR MANAGEMENT ───────────────────────────────────────

export const getAllMentors = async (req: Request, res: Response) => {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: 'MENTOR' },
      select: fullMentorUserSelect,
    });
    return res.status(200).json({ count: mentors.length, data: mentors });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getPendingMentors = async (req: Request, res: Response) => {
  try {
    const mentors = await prisma.mentorProfile.findMany({
      where: { verificationStatus: 'pending', isOnboardingComplete: true },
      select: {
        ...fullMentorProfileSelect,
        user: { select: fullUserSelect },
      },
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
      select: {
        ...fullMentorProfileSelect,
        user: { select: fullUserSelect },
      },
    });
    return res.status(200).json({ count: mentors.length, data: mentors });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getAssignedMentors = async (req: Request, res: Response) => {
  try {
    const mentorIds = await prisma.mentorshipRequest.findMany({
      where: { status: 'ACCEPTED' },
      select: { mentorId: true },
      distinct: ['mentorId'],
    });

    const ids = mentorIds.map((r) => r.mentorId);
    const mentors = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        ...fullMentorUserSelect,
        mentorRequests: {
          where: { status: 'ACCEPTED' },
          select: {
            id: true, status: true, createdAt: true,
            mentee: { select: fullUserSelect },
          },
        },
      },
    });

    return res.status(200).json({ count: mentors.length, data: mentors });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getMenteesUnderMentor = async (req: Request, res: Response) => {
  try {
    const { mentorId } = req.params;

    const mentor = await prisma.user.findUnique({
      where: { id: String(mentorId) },
      select: {
        ...fullMentorUserSelect,
        mentorRequests: {
          where: { status: 'ACCEPTED' },
          select: {
            id: true, status: true, message: true, createdAt: true,
            mentee: { select: fullUserSelect },
          },
        },
      },
    });

    if (!mentor) return res.status(404).json({ message: 'Mentor not found' });

    const mentees = (mentor as any).mentorRequests.map((r: any) => r.mentee);

    return res.status(200).json({
      mentor: { ...mentor, mentorRequests: undefined },
      count: mentees.length,
      mentees,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const approveMentor = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const existing = await prisma.mentorProfile.findUnique({ where: { userId: String(userId) } });
    if (!existing) return res.status(404).json({ message: 'Mentor profile not found' });

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

    await prisma.notification.create({
      data: {
        userId: String(userId),
        title: 'Mentor Application Approved',
        body: 'Congratulations! Your mentor application has been approved.',
      },
    });

    return res.status(200).json({ message: 'Mentor approved successfully', data: mentor });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const rejectMentor = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const existing = await prisma.mentorProfile.findUnique({ where: { userId: String(userId) } });
    if (!existing) return res.status(404).json({ message: 'Mentor profile not found' });

    const mentor = await prisma.mentorProfile.update({
      where: { userId: String(userId) },
      data: { verificationStatus: 'rejected' },
    });

    await prisma.notification.create({
      data: {
        userId: String(userId),
        title: 'Mentor Application Rejected',
        body: 'Unfortunately, your mentor application was not approved at this time.',
      },
    });

    return res.status(200).json({ message: 'Mentor rejected', data: mentor });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

// ─── USER (MENTEE) MANAGEMENT ────────────────────────────────

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: fullUserSelect,
    });
    return res.status(200).json({ count: users.length, data: users });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getAssignedUsers = async (req: Request, res: Response) => {
  try {
    const assigned = await prisma.mentorshipRequest.findMany({
      where: { status: 'ACCEPTED' },
      select: {
        id: true, status: true, message: true, createdAt: true,
        mentee: { select: fullUserSelect },
        mentor: { select: fullMentorUserSelect },
      },
    });

    return res.status(200).json({
      count: assigned.length,
      data: assigned.map((r) => ({ ...r.mentee, assignedMentor: r.mentor })),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getUnassignedUsers = async (req: Request, res: Response) => {
  try {
    const assignedMenteeIds = await prisma.mentorshipRequest.findMany({
      where: { status: 'ACCEPTED' },
      select: { menteeId: true },
      distinct: ['menteeId'],
    });

    const ids = assignedMenteeIds.map((r) => r.menteeId);

    const users = await prisma.user.findMany({
      where: { role: 'USER', id: { notIn: ids } },
      select: fullUserSelect,
    });

    return res.status(200).json({ count: users.length, data: users });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getMentorOfUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        ...fullUserSelect,
        menteeRequests: {
          where: { status: 'ACCEPTED' },
          select: {
            id: true, status: true, message: true, createdAt: true,
            mentor: { select: fullMentorUserSelect },
          },
        },
      },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    const request = (user as any).menteeRequests[0];

    return res.status(200).json({
      user: { ...user, menteeRequests: undefined },
      mentor: request ? request.mentor : null,
      assignedSince: request ? request.createdAt : null,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

// ─── ADMIN MANAGEMENT ────────────────────────────────────────

export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: fullUserSelect,
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
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: String(userId) },
      data: { role: 'ADMIN' },
      select: fullUserSelect,
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
    if (!user) return res.status(404).json({ message: 'User not found' });

    await prisma.user.delete({ where: { id: String(userId) } });
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

// ─── PROGRAMS & QR CODE ──────────────────────────────────────

export const createProgram = async (req: Request, res: Response) => {
  try {
    const { title, type, description, startTime, endTime } = req.body;

    if (!title || !type || !startTime || !endTime) {
      return res.status(400).json({ error: 'title, type, startTime and endTime are required' });
    }

    const program = await prisma.program.create({
      data: {
        title, type, description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        createdBy: (req as any).user.id,
      },
    });

    const qrPayload = JSON.stringify({ type: 'program-attendance', programId: program.id });
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

    return res.status(201).json({
      message: 'Program created successfully',
      data: program,
      qrCode: qrCodeDataUrl,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create program', details: error });
  }
};

export const getProgramQRCode = async (req: Request, res: Response) => {
  try {
    const { programId } = req.params;
    const program = await prisma.program.findUnique({ where: { id: String(programId) } });
    if (!program) return res.status(404).json({ error: 'Program not found' });

    const qrPayload = JSON.stringify({ type: 'program-attendance', programId: program.id });
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);
    return res.status(200).json({
      programId: program.id,
      title: program.title,
      qrCode: qrCodeDataUrl,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate QR code', details: error });
  }
};

export const getAllPrograms = async (req: Request, res: Response) => {
  try {
    const programs = await prisma.program.findMany({
      orderBy: { startTime: 'desc' },
      include: { _count: { select: { attendances: true } } },
    });
    return res.status(200).json({ count: programs.length, data: programs });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch programs', details: error });
  }
};

export const getProgramAttendance = async (req: Request, res: Response) => {
  try {
    const { programId } = req.params;
    const attendances = await prisma.attendance.findMany({
      where: { programId: String(programId) },
      include: { user: { select: fullUserSelect } },
    });
    return res.status(200).json({ count: attendances.length, data: attendances });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch attendance', details: error });
  }
};

// ─── DASHBOARD STATS ─────────────────────────────────────────

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [
      totalUsers, totalMentors, pendingMentors, approvedMentors, totalPrograms,
      assignedMenteeIds, assignedMentorIds,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'MENTOR' } }),
      prisma.mentorProfile.count({ where: { verificationStatus: 'pending', isOnboardingComplete: true } }),
      prisma.mentorProfile.count({ where: { verificationStatus: 'approved' } }),
      prisma.program.count(),
      prisma.mentorshipRequest.findMany({ where: { status: 'ACCEPTED' }, select: { menteeId: true }, distinct: ['menteeId'] }),
      prisma.mentorshipRequest.findMany({ where: { status: 'ACCEPTED' }, select: { mentorId: true }, distinct: ['mentorId'] }),
    ]);

    return res.status(200).json({
      data: {
        totalUsers,
        totalMentors,
        pendingMentors,
        approvedMentors,
        assignedMentors: assignedMentorIds.length,
        assignedMentees: assignedMenteeIds.length,
        unassignedMentees: totalUsers - assignedMenteeIds.length,
        totalPrograms,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};
