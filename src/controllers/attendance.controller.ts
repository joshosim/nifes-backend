import { Request, Response } from 'express';
import { prisma } from '../config/database';
import crypto from 'crypto';

// Admin: Create a program with attendance code
export const createProgram = async (req: Request, res: Response) => {
  try {
    const { title, type, description, startTime, endTime } = req.body;

    if (!title || !type || !startTime || !endTime) {
      return res.status(400).json({ error: 'title, type, startTime and endTime are required' });
    }

    // Generate a short unique 8-char attendance code
    const attendanceCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const program = await prisma.program.create({
      data: {
        title,
        type,
        description,
        attendanceCode,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        createdBy: (req as any).user.id,
      },
    });

    return res.status(201).json({
      message: 'Program created successfully',
      data: program,
      attendanceCode: program.attendanceCode,
    });
  } catch (error) {
    console.error('Create program error:', error);
    return res.status(500).json({ error: 'Failed to create program' });
  }
};

// Participant: Scan code to mark attendance
export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { attendanceCode } = req.body;
    const userId = (req as any).user.id;

    if (!attendanceCode) {
      return res.status(400).json({ error: 'Attendance code is required' });
    }

    // Find the program by code
    const program = await prisma.program.findUnique({
      where: { attendanceCode },
    });

    if (!program) {
      return res.status(404).json({ error: 'Invalid attendance code' });
    }

    const now = new Date();

    // Check if code is within valid time window
    if (now < program.startTime) {
      return res.status(400).json({ error: 'Program has not started yet' });
    }

    if (now > program.endTime) {
      return res.status(400).json({ error: 'Attendance code has expired' });
    }

    // Check if already marked
    const existing = await prisma.attendance.findUnique({
      where: { userId_programId: { userId, programId: program.id } },
    });

    if (existing) {
      return res.status(400).json({ error: 'Attendance already marked for this program' });
    }

    const attendance = await prisma.attendance.create({
      data: { userId, programId: program.id },
    });

    return res.status(201).json({
      message: `Attendance marked for ${program.title}`,
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
