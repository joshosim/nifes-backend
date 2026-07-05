import { Request, Response } from 'express';
import { prisma } from '../config/database';

const buildRegistrationDetails = (body: any, user?: any) => {
  const source = body?.details && typeof body.details === 'object' && !Array.isArray(body.details)
    ? body.details
    : {};

  const detailFields = ['name', 'email', 'phone', 'nifesZone', 'nifesSchool', 'unit', 'wing', 'courseOfStudy', 'level'];
  const details: Record<string, unknown> = {};

  for (const field of detailFields) {
    const value = source[field] ?? body?.[field];
    if (value !== undefined && value !== null && value !== '') {
      details[field] = value;
    }
  }

  if (user) {
    const fallbackFields = ['name', 'email', 'nifesZone', 'nifesSchool', 'unit', 'wing', 'courseOfStudy', 'level'];
    for (const field of fallbackFields) {
      const value = user[field];
      if (value !== undefined && value !== null && value !== '') {
        details[field] = details[field] ?? value;
      }
    }
  }

  return Object.keys(details).length > 0 ? details : null;
};

const resolveProgramId = (body: any) => {
  if (body?.programId) return String(body.programId);
  if (body?.qrPayload) {
    if (typeof body.qrPayload === 'string' && body.qrPayload.startsWith('{')) {
      try {
        const parsed = JSON.parse(body.qrPayload);
        if (parsed?.programId) return String(parsed.programId);
      } catch {
        // fall through to raw handling
      }
    }

    if (typeof body.qrPayload === 'string' && body.qrPayload.startsWith('program:')) {
      return body.qrPayload.replace('program:', '');
    }
  }

  if (body?.attendanceCode) return body.attendanceCode;
  return null;
};

// Participant: Scan QR or submit program info to mark attendance
export const markAttendance = async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const userId = (req as any).user?.id;
    const mode = body.mode === 'others' ? 'others' : 'self';
    const programId = resolveProgramId(body);

    if (!programId) {
      return res.status(400).json({ error: 'Program reference is required' });
    }

    const program = await prisma.program.findUnique({
      where: { id: String(programId) },
    });

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const now = new Date();

    if (now < program.startTime) {
      return res.status(400).json({ error: 'Program has not started yet' });
    }

    if (now > program.endTime) {
      return res.status(400).json({ error: 'Attendance registration window has closed' });
    }

    if (mode === 'self') {
      if (!userId) {
        return res.status(401).json({ error: 'Authentication is required for self-registration' });
      }

      const existing = await prisma.attendance.findUnique({
        where: { userId_programId: { userId, programId: program.id } },
      });

      if (existing) {
        return res.status(400).json({ error: 'Attendance already marked for this program' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, nifesZone: true, nifesSchool: true, unit: true, wing: true, courseOfStudy: true, level: true },
      });

      const attendance = await prisma.attendance.create({
        data: {
          userId,
          programId: program.id,
          details: buildRegistrationDetails(body, user) as any,
        },
      });

      return res.status(201).json({
        message: `Attendance marked for ${program.title}`,
        data: attendance,
      });
    }

    const registrationDetails = buildRegistrationDetails(body);
    if (!registrationDetails?.name || !registrationDetails?.email) {
      return res.status(400).json({ error: 'Name and email are required for other registrations' });
    }

    const existing = await prisma.attendance.findFirst({
      where: {
        programId: program.id,
        details: {
          path: ['email'],
          equals: registrationDetails.email,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Attendance already marked for this person for this program' });
    }

    const attendance = await prisma.attendance.create({
      data: {
        programId: program.id,
        details: registrationDetails as any,
      },
    });

    return res.status(201).json({
      message: `Attendance registered for ${program.title}`,
      data: attendance,
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    return res.status(500).json({ error: 'Failed to mark attendance' });
  }
};

// Admin: Get all attendances for a program
export const getProgramAttendance = async (req: Request, res: Response) => {
  try {
    const { programId } = req.params;

    const attendances = await prisma.attendance.findMany({
      where: { programId: String(programId) },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({
      count: attendances.length,
      data: attendances,
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    return res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// Admin: Get all programs
export const getAllPrograms = async (req: Request, res: Response) => {
  try {
    const programs = await prisma.program.findMany({
      orderBy: { startTime: 'desc' },
      include: { _count: { select: { attendances: true } } },
    });

    return res.status(200).json({ data: programs });
  } catch (error) {
    console.error('Get programs error:', error);
    return res.status(500).json({ error: 'Failed to fetch programs' });
  }
};
