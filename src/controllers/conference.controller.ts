import { Request, Response } from 'express';
import { prisma } from '../config/database';

type AuthenticatedRequest = Request & {
  user?: { id: string; role: string };
};

const getUser = (req: Request) => (req as AuthenticatedRequest).user;

export const getOpenConferences = async (_req: Request, res: Response) => {
  try {
    const user = getUser(_req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const conferences = await prisma.adminConference.findMany({
      where: { status: 'active', endDate: { gte: today } },
      include: { _count: { select: { mentors: true, mentees: true } } },
      orderBy: { startDate: 'asc' },
    });
    const registrations = user?.role === 'MENTOR'
      ? await prisma.conferenceMentor.findMany({
          where: { mentorId: user.id, conferenceId: { in: conferences.map(({ id }) => id) } },
          select: { conferenceId: true },
        })
      : await prisma.conferenceMentee.findMany({
          where: { menteeId: user?.id ?? '', conferenceId: { in: conferences.map(({ id }) => id) } },
          select: { conferenceId: true },
        });
    const registeredConferenceIds = new Set(registrations.map(({ conferenceId }) => conferenceId));
    return res.json({
      conferences: conferences.map((conference) => ({
        id: conference.id,
        name: conference.name,
        year: conference.year,
        zone: conference.zone,
        startDate: conference.startDate,
        endDate: conference.endDate,
        details: conference.details,
        mentorCount: conference._count.mentors,
        menteeCount: conference._count.mentees,
        isRegistered: registeredConferenceIds.has(conference.id),
      })),
    });
  } catch (error) {
    console.error('Error fetching open conferences:', error);
    return res.status(500).json({ error: 'Could not load conferences.' });
  }
};

export const registerForConference = async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user || !['USER', 'MENTOR'].includes(user.role)) {
      return res.status(403).json({ error: 'Only mentors and mentees can register.' });
    }

    const conferenceId = String(req.params.id);
    const conference = await prisma.adminConference.findUnique({
      where: { id: conferenceId },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!conference || conference.status !== 'active' || conference.endDate < today) {
      return res.status(404).json({ error: 'Conference registration is not available.' });
    }

    if (user.role === 'MENTOR') {
      const profile = await prisma.mentorProfile.findUnique({ where: { userId: user.id } });
      if (!profile || profile.verificationStatus !== 'approved' || !profile.isOnboardingComplete) {
        return res.status(403).json({ error: 'Mentor approval is required to register.' });
      }
      await prisma.conferenceMentor.upsert({
        where: { conferenceId_mentorId: { conferenceId, mentorId: user.id } },
        create: { conferenceId, mentorId: user.id },
        update: {},
      });
    } else {
      await prisma.conferenceMentee.upsert({
        where: { conferenceId_menteeId: { conferenceId, menteeId: user.id } },
        create: { conferenceId, menteeId: user.id },
        update: {},
      });
    }

    return res.json({ message: 'You are registered for this conference.', registered: true });
  } catch (error) {
    console.error('Error registering for conference:', error);
    return res.status(500).json({ error: 'Could not register for this conference.' });
  }
};

export const getMyGroups = async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const groups = await prisma.adminGroup.findMany({
      where: {
        OR: [
          { facilitatorId: user.id },
          { members: { some: { menteeId: user.id } } },
        ],
      },
      include: {
        conference: { select: { id: true, name: true, startDate: true, endDate: true } },
        facilitator: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
      orderBy: { conference: { startDate: 'asc' } },
    });

    return res.json({
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        whatsappUrl: group.whatsappUrl,
        isFacilitator: group.facilitatorId === user.id,
        facilitatorName: group.facilitator?.name ?? null,
        memberCount: group._count.members,
        conference: group.conference,
      })),
    });
  } catch (error) {
    console.error('Error fetching assigned groups:', error);
    return res.status(500).json({ error: 'Could not load your small groups.' });
  }
};

export const updateMyGroupWhatsAppLink = async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const groupId = String(req.params.groupId);
    const rawUrl = typeof req.body?.whatsappUrl === 'string' ? req.body.whatsappUrl.trim() : '';
    if (!rawUrl) return res.status(400).json({ error: 'A WhatsApp group invite link is required.' });

    let inviteUrl: URL;
    try {
      inviteUrl = new URL(rawUrl);
    } catch {
      return res.status(400).json({ error: 'Enter a valid WhatsApp group invite link.' });
    }
    if (
      inviteUrl.protocol !== 'https:' ||
      inviteUrl.hostname !== 'chat.whatsapp.com' ||
      inviteUrl.pathname.length < 2
    ) {
      return res.status(400).json({ error: 'Use a valid https://chat.whatsapp.com invite link.' });
    }

    const group = await prisma.adminGroup.findUnique({ where: { id: groupId } });
    if (!group || !user || group.facilitatorId !== user.id) {
      return res.status(404).json({ error: 'You are not the facilitator of this group.' });
    }

    const updated = await prisma.adminGroup.update({
      where: { id: groupId },
      data: { whatsappUrl: inviteUrl.toString() },
      select: { id: true, whatsappUrl: true },
    });
    return res.json({ group: updated });
  } catch (error) {
    console.error('Error updating WhatsApp group link:', error);
    return res.status(500).json({ error: 'Could not update the WhatsApp group link.' });
  }
};

export const getPublishedSessions = async (_req: Request, res: Response) => {
  try {
    const sessions = await prisma.recordedSession.findMany({
      where: { status: 'published' },
      include: { mentor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({
      sessions: sessions.map((session) => ({
        ...session,
        mentorName: session.mentor?.name ?? null,
      })),
    });
  } catch (error) {
    console.error('Error fetching published sessions:', error);
    return res.status(500).json({ error: 'Could not load recorded sessions.' });
  }
};
