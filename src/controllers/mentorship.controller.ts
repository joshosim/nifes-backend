import { Request, Response } from 'express';
import { prisma } from '../config/database';

const getUser = (req: Request) => (req as any).user as { id: string; email: string; role: string };

export const sendRequest = async (req: Request, res: Response) => {
  try {
    const menteeId = getUser(req).id;
    const mentorId = String(req.params.mentorId);
    const { message } = req.body;

    const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
    if (!mentor || mentor.role !== 'MENTOR') {
      return res.status(404).json({ error: 'Mentor not found' });
    }
    if (menteeId === mentorId) {
      return res.status(400).json({ error: 'You cannot request yourself' });
    }

    const existing = await prisma.mentorshipRequest.findUnique({
      where: { menteeId_mentorId: { menteeId, mentorId } },
    });
    if (existing) {
      return res.status(409).json({ error: 'Request already sent', status: existing.status });
    }

    const mentee = await prisma.user.findUnique({ where: { id: menteeId }, select: { name: true } });

    const request = await prisma.mentorshipRequest.create({ data: { menteeId, mentorId, message } });
    await prisma.notification.create({
      data: {
        userId: mentorId,
        title: 'New Mentorship Request',
        body: `${mentee!.name} has requested you as a mentor.`,
      },
    });

    return res.status(201).json({ message: 'Request sent', data: request });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error });
  }
};

export const getMenteeRequestStatus = async (req: Request, res: Response) => {
  try {
    const menteeId = getUser(req).id;
    const requests = await prisma.mentorshipRequest.findMany({
      where: { menteeId },
      include: {
        mentor: {
          select: {
            id: true, name: true, avatar: true,
            mentorProfile: { select: { profilePhotoUrl: true, bio: true, focusArea: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ requests });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error });
  }
};

export const getMentorIncomingRequests = async (req: Request, res: Response) => {
  try {
    const mentorId = getUser(req).id;
    const requests = await prisma.mentorshipRequest.findMany({
      where: { mentorId },
      include: {
        mentee: {
          select: { id: true, name: true, avatar: true, nifesSchool: true, courseOfStudy: true, level: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ requests });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error });
  }
};

export const respondToRequest = async (req: Request, res: Response) => {
  try {
    const mentorId = getUser(req).id;
    const requestId = String(req.params.requestId);
    const { action } = req.body;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "accept" or "decline"' });
    }

    const request = await prisma.mentorshipRequest.findUnique({ where: { id: requestId } });
    if (!request || request.mentorId !== mentorId) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already responded to' });
    }

    const newStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
    const mentor = await prisma.user.findUnique({ where: { id: mentorId }, select: { name: true } });

    const updated = await prisma.mentorshipRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
    });
    await prisma.notification.create({
      data: {
        userId: request.menteeId,
        title: `Mentorship Request ${newStatus === 'ACCEPTED' ? 'Accepted' : 'Declined'}`,
        body: `${mentor!.name} has ${newStatus === 'ACCEPTED' ? 'accepted' : 'declined'} your mentorship request.`,
      },
    });

    return res.json({ message: `Request ${newStatus.toLowerCase()}`, data: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error });
  }
};

export const getMyMentees = async (req: Request, res: Response) => {
  try {
    const mentorId = getUser(req).id;
    const accepted = await prisma.mentorshipRequest.findMany({
      where: { mentorId, status: 'ACCEPTED' },
      include: {
        mentee: {
          select: { id: true, name: true, avatar: true, email: true, nifesSchool: true, courseOfStudy: true, level: true },
        },
      },
    });
    return res.json({ mentees: accepted.map((r) => r.mentee) });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error });
  }
};

export const getMenteesByMentor = async (req: Request, res: Response) => {
  try {
    const mentorId = String(req.params.mentorId);
    const accepted = await prisma.mentorshipRequest.findMany({
      where: { mentorId, status: 'ACCEPTED' },
      include: {
        mentee: {
          select: { id: true, name: true, avatar: true, nifesSchool: true, courseOfStudy: true, level: true },
        },
      },
    });
    return res.json({ mentees: accepted.map((r) => r.mentee) });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error });
  }
};
