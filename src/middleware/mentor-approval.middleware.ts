import { NextFunction, Request, RequestHandler, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from './auth.middleware';

export async function isMentorApproved(userId: string) {
  const profile = await prisma.mentorProfile.findUnique({
    where: { userId },
    select: { verificationStatus: true, isOnboardingComplete: true },
  });

  return (
    profile?.verificationStatus === 'approved' &&
    profile.isOnboardingComplete
  );
}

export const requireSelfMentor: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = (req as AuthRequest).user;

  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (user.role !== 'MENTOR' || user.id !== String(req.params.userId)) {
    res.status(403).json({ error: 'You can only manage your own mentor application' });
    return;
  }

  next();
};

export const requireApprovedMentor: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = (req as AuthRequest).user;

  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (user.role !== 'MENTOR' || !(await isMentorApproved(user.id))) {
    res.status(403).json({ error: 'Mentor approval is required for this action' });
    return;
  }

  next();
};

export const requireMentorApprovalForChat: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = (req as AuthRequest).user;

  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (user.role === 'MENTOR' && !(await isMentorApproved(user.id))) {
    res.status(403).json({ error: 'Mentor approval is required to use chat' });
    return;
  }
  if (user.role !== 'MENTOR' && user.role !== 'USER') {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  next();
};

export const requireOwnApprovedMentor = (
  paramName: string,
): RequestHandler => async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthRequest).user;

  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (
    user.role !== 'MENTOR' ||
    user.id !== String(req.params[paramName]) ||
    !(await isMentorApproved(user.id))
  ) {
    res.status(403).json({ error: 'Approved mentors can only access their own mentees' });
    return;
  }

  next();
};
