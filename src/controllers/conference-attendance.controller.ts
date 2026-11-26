import { randomInt } from 'crypto';
import { Request, Response } from 'express';
import { prisma } from '../config/database';

const currentUser = (req: Request) => (req as any).user as { id: string; role: string };
const formatStatus = (status: string, endTime: Date) =>
  status === 'pending' && Date.now() > endTime.getTime() ? 'absent' : status;

export const getConferenceSessions = async (req: Request, res: Response) => {
  try {
    const conferenceId = String(req.params.id);
    const conference = await prisma.adminConference.findUnique({ where: { id: conferenceId }, select: { id: true } });
    if (!conference) return res.status(404).json({ message: 'Conference not found' });
    const sessions = await prisma.conferenceSession.findMany({
      where: { conferenceId }, orderBy: { startTime: 'asc' },
      include: { _count: { select: { attendance: true } } },
    });
    return res.json({ sessions });
  } catch (error) {
    console.error('Get conference sessions error:', error);
    return res.status(500).json({ message: 'Could not load conference sessions' });
  }
};

export const createConferenceSession = async (req: Request, res: Response) => {
  try {
    const conferenceId = String(req.params.id);
    const { title, startTime, endTime } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim() || !startTime || !endTime) {
      return res.status(400).json({ message: 'title, startTime and endTime are required' });
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      return res.status(400).json({ message: 'Provide valid times with endTime after startTime' });
    }
    const conference = await prisma.adminConference.findUnique({ where: { id: conferenceId }, select: { id: true } });
    if (!conference) return res.status(404).json({ message: 'Conference not found' });
    const session = await prisma.conferenceSession.create({
      data: { conferenceId, title: title.trim(), startTime: start, endTime: end },
    });
    return res.status(201).json({ session });
  } catch (error) {
    console.error('Create conference session error:', error);
    return res.status(500).json({ message: 'Could not create conference session' });
  }
};

export const openSessionAttendance = async (req: Request, res: Response) => {
  try {
    const conferenceId = String(req.params.id);
    const sessionId = String(req.params.sessionId);
    const session = await prisma.conferenceSession.findFirst({ where: { id: sessionId, conferenceId } });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.attendanceOpen) return res.status(409).json({ message: 'Attendance has already been opened for this session' });
    const now = new Date();
    if (now < session.startTime || now > session.endTime) {
      return res.status(400).json({ message: 'Attendance can only be opened during the session time' });
    }

    const [mentees, mentors] = await Promise.all([
      prisma.conferenceMentee.findMany({ where: { conferenceId }, select: { menteeId: true } }),
      prisma.conferenceMentor.findMany({ where: { conferenceId }, select: { mentorId: true } }),
    ]);
    const userIds = [...new Set([...mentees.map((row) => row.menteeId), ...mentors.map((row) => row.mentorId)])];
    if (!userIds.length) return res.status(400).json({ message: 'No registered mentees or mentors to notify' });
    const code = String(randomInt(100000, 1000000));

    await prisma.$transaction(async (tx) => {
      await tx.conferenceSession.update({ where: { id: sessionId }, data: { attendanceCode: code, attendanceOpen: true } });
      await tx.conferenceSessionAttendance.createMany({
        data: userIds.map((userId) => ({ sessionId, userId })), skipDuplicates: true,
      });
      await tx.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          title: 'Session attendance requested',
          body: `Please confirm your attendance for “${session.title}” by entering the code in the app or declining before the session ends.`,
        })),
      });
    });
    return res.json({ sessionId, code, recipientCount: userIds.length, attendanceClosesAt: session.endTime });
  } catch (error) {
    console.error('Open session attendance error:', error);
    return res.status(500).json({ message: 'Could not open session attendance' });
  }
};

export const getConferenceSessionAttendance = async (req: Request, res: Response) => {
  try {
    const session = await prisma.conferenceSession.findFirst({
      where: { id: String(req.params.sessionId), conferenceId: String(req.params.id) },
      include: { attendance: { include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { user: { name: 'asc' } } } },
    });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    const attendance = session.attendance.map(({ user, status, ...row }) => ({ ...row, user, status: formatStatus(status, session.endTime) }));
    return res.json({ session: { id: session.id, title: session.title, startTime: session.startTime, endTime: session.endTime }, count: attendance.length, attendance });
  } catch (error) {
    console.error('Get session attendance error:', error);
    return res.status(500).json({ message: 'Could not load session attendance' });
  }
};

export const getMySessionAttendance = async (req: Request, res: Response) => {
  try {
    const userId = currentUser(req).id;
    const attendance = await prisma.conferenceSessionAttendance.findMany({
      where: { userId, session: { attendanceOpen: true } },
      include: { session: { select: { id: true, title: true, startTime: true, endTime: true, conference: { select: { id: true, name: true } } } } },
      orderBy: { session: { startTime: 'asc' } },
    });
    return res.json({ sessions: attendance.map(({ session, status }) => ({ ...session, status: formatStatus(status, session.endTime) })) });
  } catch (error) {
    console.error('Get my session attendance error:', error);
    return res.status(500).json({ message: 'Could not load session attendance' });
  }
};

export const respondToSessionAttendance = async (req: Request, res: Response) => {
  try {
    const userId = currentUser(req).id;
    const sessionId = String(req.params.sessionId);
    const { action, code } = req.body ?? {};
    if (action !== 'submit' && action !== 'decline') {
      return res.status(400).json({ message: 'action must be submit or decline' });
    }
    const session = await prisma.conferenceSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    const now = new Date();
    if (!session.attendanceOpen || now < session.startTime || now > session.endTime) {
      return res.status(400).json({ message: 'Attendance is closed for this session' });
    }
    const participation = await prisma.conferenceSessionAttendance.findUnique({ where: { sessionId_userId: { sessionId, userId } } });
    if (!participation) return res.status(403).json({ message: 'You are not registered for this conference session' });
    if (participation.status !== 'pending') return res.status(409).json({ message: 'Attendance response has already been recorded' });
    if (action === 'submit' && String(code ?? '').trim() !== session.attendanceCode) {
      return res.status(400).json({ message: 'Incorrect attendance code' });
    }
    const updated = await prisma.conferenceSessionAttendance.update({
      where: { sessionId_userId: { sessionId, userId } },
      data: { status: action === 'submit' ? 'present' : 'declined' },
    });
    return res.json({ attendance: updated });
  } catch (error) {
    console.error('Respond to session attendance error:', error);
    return res.status(500).json({ message: 'Could not record attendance response' });
  }
};
