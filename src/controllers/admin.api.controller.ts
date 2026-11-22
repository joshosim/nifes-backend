import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
const db: any = prisma;

const userSelect = { id: true, name: true, email: true, phone: true, nifesSchool: true, courseOfStudy: true, level: true, avatar: true, profilePhotoUrl: true, createdAt: true } as const;
const asDate = (value: unknown) => {
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid date');
  return date;
};
const err = (res: Response, error: unknown) => res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });

export const addMentor = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, availabilityStatus, focusAreas = [], affiliation } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'name and email are required' });
    const password = await bcrypt.hash(`${Date.now()}-${Math.random()}`, 10);
    const mentor = await db.user.create({ data: { name, email: String(email).toLowerCase(), phone, password, role: 'MENTOR', isVerified: true, mentorProfile: { create: { verificationStatus: 'approved', isOnboardingComplete: true, isAvailable: availabilityStatus === 'Active', focusAreas: Array.isArray(focusAreas) ? focusAreas : [], affiliation } } }, include: { mentorProfile: true } });
    return res.status(201).json({ mentor: formatMentor(mentor) });
  } catch (error) { return err(res, error); }
};

function formatMentor(m: any) {
  return { id: m.id, name: m.name, email: m.email, phone: m.phone, verificationStatus: m.mentorProfile?.verificationStatus ?? 'pending', isOnboardingComplete: m.mentorProfile?.isOnboardingComplete ?? false, availabilityStatus: m.mentorProfile?.isAvailable ? 'Active' : 'Inactive', focusAreas: m.mentorProfile?.focusAreas ?? [], affiliation: m.mentorProfile?.affiliation ?? m.mentorProfile?.campus, profilePhotoUrl: m.mentorProfile?.profilePhotoUrl ?? m.profilePhotoUrl ?? m.avatar, createdAt: m.createdAt };
}

export const getMentorTable = async (_: Request, res: Response) => {
  try { const rows = await db.user.findMany({ where: { role: 'MENTOR' }, include: { mentorProfile: true }, orderBy: { createdAt: 'desc' } }); return res.json({ mentors: rows.map(formatMentor) }); } catch (e) { return err(res, e); }
};
export const getMentorTableByStatus = (status: string) => async (_: Request, res: Response) => {
  try { const rows = await db.user.findMany({ where: { role: 'MENTOR', mentorProfile: { verificationStatus: status, ...(status === 'pending' ? { isOnboardingComplete: true } : {}) } }, include: { mentorProfile: true }, orderBy: { createdAt: 'desc' } }); return res.json({ mentors: rows.map(formatMentor) }); } catch (e) { return err(res, e); }
};
export const getAdminUsers = async (_: Request, res: Response) => {
  try { const rows = await db.user.findMany({ where: { role: 'USER' }, select: userSelect, orderBy: { createdAt: 'desc' } }); return res.json({ users: rows.map((u: any) => ({ ...u, school: u.nifesSchool, profileImage: u.profilePhotoUrl ?? u.avatar })) }); } catch (e) { return err(res, e); }
};
export const getUsersByAssignment = (assigned: boolean) => async (_: Request, res: Response) => {
  try { const ids = await db.mentorshipRequest.findMany({ where: { status: 'ACCEPTED' }, select: { menteeId: true }, distinct: ['menteeId'] }); const rows = await db.user.findMany({ where: { role: 'USER', id: assigned ? { in: ids.map((x: any) => x.menteeId) } : { notIn: ids.map((x: any) => x.menteeId) } }, select: userSelect }); return res.json({ users: rows.map((u: any) => ({ ...u, school: u.nifesSchool, profileImage: u.profilePhotoUrl ?? u.avatar })) }); } catch (e) { return err(res, e); }
};

export const getConferenceList = async (req: Request, res: Response) => {
  try {
    const archived = req.path.endsWith('/archived');
    const rows = await db.adminConference.findMany({ where: archived ? { status: 'archived' } : { status: { not: 'archived' } }, include: { _count: { select: { mentors: true, mentees: true, groups: true } }, groups: { where: { facilitatorId: null } } }, orderBy: { startDate: 'desc' } });
    return res.json({ programs: rows.map((p: any) => ({ id: p.id, name: p.name, year: p.year, zone: p.zone, startDate: p.startDate.toISOString().slice(0,10), endDate: p.endDate.toISOString().slice(0,10), status: p.status, mentorCount: p._count.mentors, menteeCount: p._count.mentees, assignedMenteeCount: 0, groupCount: p._count.groups, facilitatorsWithoutGroups: p.groups.length })) });
  } catch (e) { return err(res, e); }
};
export const createConference = async (req: Request, res: Response) => {
  try { const { name, year, zone, startDate, endDate, details, status = 'draft' } = req.body; if (!name || !year || !zone || !startDate || !endDate) return res.status(400).json({ message: 'name, year, zone, startDate and endDate are required' }); const [mentees, mentors] = await Promise.all([db.user.findMany({ where: { role: 'USER' }, select: { id: true } }), db.user.findMany({ where: { role: 'MENTOR', mentorProfile: { verificationStatus: 'approved' } }, select: { id: true } })]); const p = await db.adminConference.create({ data: { name, year: Number(year), zone, startDate: asDate(startDate), endDate: asDate(endDate), details, status, mentees: { createMany: { data: mentees.map((u: any) => ({ menteeId: u.id })) } }, mentors: { createMany: { data: mentors.map((u: any) => ({ mentorId: u.id })) } } } }); return res.status(201).json({ program: p }); } catch (e) { return err(res, e); }
};
export const conferenceDetail = async (req: Request, res: Response) => {
  try { const p = await db.adminConference.findUnique({ where: { id: String(req.params.id) }, include: { _count: { select: { mentors: true, mentees: true, groups: true } } } }); if (!p) return res.status(404).json({ message: 'Program not found' }); return res.json({ program: p }); } catch (e) { return err(res, e); }
};
export const archiveConference = async (req: Request, res: Response) => {
  try { const p = await db.adminConference.update({ where: { id: String(req.params.id) }, data: { status: 'archived' } }); return res.json({ program: p }); } catch (e) { return err(res, e); }
};
export const conferencePeople = (kind: 'mentors' | 'mentees') => async (req: Request, res: Response) => {
  try { const id = String(req.params.id); const delegate: any = kind === 'mentors' ? db.conferenceMentor : db.conferenceMentee; const links = await delegate.findMany({ where: { conferenceId: id }, include: { [kind === 'mentors' ? 'mentor' : 'mentee']: { select: userSelect } } }); const people = links.map((l: any) => kind === 'mentors' ? l.mentor : l.mentee); return res.json({ [kind]: people }); } catch (e) { return err(res, e); }
};
export const getGroups = async (req: Request, res: Response) => {
  try { const groups = await db.adminGroup.findMany({ where: { conferenceId: String(req.params.id) }, include: { facilitator: { select: { name: true } }, members: { include: { mentee: { select: { id: true, name: true } } } } }, orderBy: { name: 'asc' } }); return res.json({ groups: groups.map((g: any) => ({ id: g.id, name: g.name, facilitatorId: g.facilitatorId, facilitatorName: g.facilitator?.name ?? null, menteeCount: g.members.length, menteeIds: g.members.map((m: any) => m.menteeId), status: g.members.length ? 'assigned' : 'unassigned' })) }); } catch (e) { return err(res, e); }
};
export const createGroup = async (req: Request, res: Response) => {
  try { const { name, facilitatorId, menteeIds = [] } = req.body; if (!name) return res.status(400).json({ message: 'name is required' }); const group = await db.adminGroup.create({ data: { conferenceId: String(req.params.id), name, facilitatorId, members: { create: Array.isArray(menteeIds) ? menteeIds.map((menteeId: string) => ({ menteeId })) : [] } }, include: { members: true } }); return res.status(201).json({ group }); } catch (e) { return err(res, e); }
};
export const updateGroup = async (req: Request, res: Response) => {
  try { const { facilitatorId, menteeIds } = req.body; const groupId = String(req.params.groupId); const data: any = {}; if (facilitatorId !== undefined) data.facilitatorId = facilitatorId || null; if (Array.isArray(menteeIds)) { await db.adminGroupMember.deleteMany({ where: { groupId } }); data.members = { create: menteeIds.map((menteeId: string) => ({ menteeId })) }; } const group = await db.adminGroup.update({ where: { id: groupId }, data, include: { members: true } }); return res.json({ group }); } catch (e) { return err(res, e); }
};
export const randomAssign = async (req: Request, res: Response) => {
  try {
    const conferenceId = String(req.params.id);
    const [groups, mentees] = await Promise.all([db.adminGroup.findMany({ where: { conferenceId }, include: { members: { include: { mentee: { select: { name: true } } } }, facilitator: { select: { name: true } } } }), db.conferenceMentee.findMany({ where: { conferenceId }, include: { mentee: { select: { id: true, name: true } } } })]);
    if (!groups.length) return res.status(400).json({ message: 'Create at least one group before assigning mentees' });
    const already = new Set(groups.flatMap((g: any) => g.members.map((m: any) => m.menteeId)));
    const available = mentees.filter((m: any) => !already.has(m.menteeId)).sort(() => Math.random() - .5);
    const proposed: Record<string, any[]> = Object.fromEntries(groups.map((g: any) => [g.id, []]));
    available.forEach((m: any, i: number) => proposed[groups[i % groups.length].id].push(m.mentee));
    return res.json({ preview: { preservedRelationships: already.size, newProposals: available.length, totalAllocated: already.size + available.length, mentorLedGroups: groups.filter((g: any) => g.facilitatorId).length, groups: groups.map((g: any) => ({ id: g.id, name: g.name, facilitatorName: g.facilitator?.name ?? '', size: g.members.length + proposed[g.id].length, preserved: g.members.length, proposed: proposed[g.id].length, members: [...g.members.map((m: any) => ({ id: m.menteeId, name: m.mentee.name, status: 'preserved' })), ...proposed[g.id].map((m: any) => ({ ...m, status: 'proposed' }))] })) } });
  } catch (e) { return err(res, e); }
};
export const confirmAssignments = async (req: Request, res: Response) => {
  try { const groups = Array.isArray(req.body?.groups) ? req.body.groups : []; await db.$transaction(groups.flatMap((g: any) => Array.isArray(g.menteeIds) ? g.menteeIds.map((menteeId: string) => db.adminGroupMember.upsert({ where: { groupId_menteeId: { groupId: g.id, menteeId } }, create: { groupId: g.id, menteeId }, update: {} })) : [])); return res.json({ message: 'Assignments confirmed' }); } catch (e) { return err(res, e); }
};
export const conferenceReport = async (req: Request, res: Response) => {
  try { const [totalMentors, totalMentees, groups] = await Promise.all([db.conferenceMentor.count({ where: { conferenceId: String(req.params.id) } }), db.conferenceMentee.count({ where: { conferenceId: String(req.params.id) } }), db.adminGroup.findMany({ where: { conferenceId: String(req.params.id) }, include: { _count: { select: { members: true } } } })]); const assignedMentees = groups.reduce((n: number,g: any)=>n+g._count.members,0); return res.json({ report: { totalMentors, assignedMentees, unassignedMentees: Math.max(totalMentees-assignedMentees,0) } }); } catch (e) { return err(res, e); }
};

export const getRecordedSessions = async (_: Request, res: Response) => {
  try { const sessions = await db.recordedSession.findMany({ include: { mentor: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }); return res.json({ sessions: sessions.map((s: any) => ({ ...s, mentorName: s.mentor?.name ?? null })) }); } catch (e) { return err(res, e); }
};
export const createRecordedSession = async (req: Request, res: Response) => {
  try { const { title, description, series, mentorId, contentType, duration, keyTakeaways = [], status = 'draft', thumbnailUrl, mediaUrl } = req.body; if (!title || !contentType) return res.status(400).json({ message: 'title and contentType are required' }); const session = await db.recordedSession.create({ data: { title, description, series, mentorId, contentType, duration, keyTakeaways, status, thumbnailUrl, mediaUrl } }); return res.status(201).json({ session }); } catch (e) { return err(res, e); }
};
export const updateRecordedSession = async (req: Request, res: Response) => {
  try { const data = { ...req.body }; delete data.id; delete data.createdAt; const session = await db.recordedSession.update({ where: { id: String(req.params.id) }, data }); return res.json({ session }); } catch (e) { return err(res, e); }
};
export const deleteRecordedSession = async (req: Request, res: Response) => {
  try { await db.recordedSession.delete({ where: { id: String(req.params.id) } }); return res.json({ message: 'Session deleted' }); } catch (e) { return err(res, e); }
};
export const publishRecordedSession = async (req: Request, res: Response) => {
  try { const session = await db.recordedSession.update({ where: { id: String(req.params.id) }, data: { status: req.body?.status === 'draft' ? 'draft' : 'published' } }); return res.json({ session }); } catch (e) { return err(res, e); }
};
export const setSessionAsset = (field: 'thumbnailUrl' | 'mediaUrl') => async (req: Request, res: Response) => {
  try { const url = (req.file as any)?.path ?? req.body?.url; if (!url) return res.status(400).json({ message: 'Upload a file or provide url' }); const session = await db.recordedSession.update({ where: { id: String(req.params.id) }, data: { [field]: url } }); return res.json({ session }); } catch (e) { return err(res, e); }
};

export const getAdminProfile = async (req: Request, res: Response) => {
  try { const id = (req as any).user.id; const admin = await db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, designation: true, role: true, phone: true, profilePhotoUrl: true } }); if (!admin) return res.status(404).json({ message: 'Admin not found' }); return res.json({ admin: { ...admin, role: admin.role === 'ADMIN' ? 'Super Admin' : admin.role } }); } catch (e) { return err(res, e); }
};
export const updateAdminProfile = async (req: Request, res: Response) => {
  try { const { name, email, designation, phone, profilePhotoUrl } = req.body; const admin = await db.user.update({ where: { id: (req as any).user.id }, data: { name, email, designation, phone, profilePhotoUrl }, select: { id: true, name: true, email: true, designation: true, role: true, phone: true, profilePhotoUrl: true } }); return res.json({ admin }); } catch (e) { return err(res, e); }
};
export const updateAdminPassword = async (req: Request, res: Response) => {
  try { const { currentPassword, newPassword } = req.body; if (!currentPassword || !newPassword || String(newPassword).length < 8) return res.status(400).json({ message: 'Current password and a new password of at least 8 characters are required' }); const admin = await db.user.findUnique({ where: { id: (req as any).user.id } }); if (!admin?.password || !(await bcrypt.compare(currentPassword, admin.password))) return res.status(400).json({ message: 'Current password is incorrect' }); await db.user.update({ where: { id: admin.id }, data: { password: await bcrypt.hash(newPassword, 10) } }); return res.json({ message: 'Password updated' }); } catch (e) { return err(res, e); }
};
export const updateAdminNotifications = async (req: Request, res: Response) => {
  try { const allowed = ['mentorRegistrations','menteeRegistrations','conferenceNotifications','adminUpdates']; const prefs: any = {}; for (const key of allowed) if (typeof req.body?.[key] === 'boolean') prefs[key] = req.body[key]; const admin = await db.user.update({ where: { id: (req as any).user.id }, data: { notificationPreferences: prefs }, select: { notificationPreferences: true } }); return res.json({ notifications: admin.notificationPreferences }); } catch (e) { return err(res, e); }
};
