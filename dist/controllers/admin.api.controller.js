"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdminNotifications = exports.updateAdminPassword = exports.updateAdminProfile = exports.getAdminProfile = exports.setSessionAsset = exports.publishRecordedSession = exports.deleteRecordedSession = exports.updateRecordedSession = exports.createRecordedSession = exports.getRecordedSessions = exports.conferenceReport = exports.confirmAssignments = exports.randomAssign = exports.updateGroup = exports.createGroup = exports.getGroups = exports.conferencePeople = exports.archiveConference = exports.conferenceDetail = exports.createConference = exports.getConferenceList = exports.getUsersByAssignment = exports.getAdminUsers = exports.getMentorTableByStatus = exports.getMentorTable = exports.addMentor = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const db = database_1.prisma;
const userSelect = { id: true, name: true, email: true, phone: true, nifesSchool: true, courseOfStudy: true, level: true, avatar: true, profilePhotoUrl: true, createdAt: true };
const asDate = (value) => {
    const date = new Date(String(value));
    if (!Number.isFinite(date.getTime()))
        throw new Error('Invalid date');
    return date;
};
const err = (res, error) => res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
const addMentor = async (req, res) => {
    try {
        const { name, email, phone, availabilityStatus, focusAreas = [], affiliation } = req.body;
        if (!name || !email)
            return res.status(400).json({ message: 'name and email are required' });
        const password = await bcryptjs_1.default.hash(`${Date.now()}-${Math.random()}`, 10);
        const mentor = await db.user.create({ data: { name, email: String(email).toLowerCase(), phone, password, role: 'MENTOR', isVerified: true, mentorProfile: { create: { verificationStatus: 'approved', isOnboardingComplete: true, isAvailable: availabilityStatus === 'Active', focusAreas: Array.isArray(focusAreas) ? focusAreas : [], affiliation } } }, include: { mentorProfile: true } });
        return res.status(201).json({ mentor: formatMentor(mentor) });
    }
    catch (error) {
        return err(res, error);
    }
};
exports.addMentor = addMentor;
function formatMentor(m) {
    return { id: m.id, name: m.name, email: m.email, phone: m.phone, verificationStatus: m.mentorProfile?.verificationStatus ?? 'pending', availabilityStatus: m.mentorProfile?.isAvailable ? 'Active' : 'Inactive', focusAreas: m.mentorProfile?.focusAreas ?? [], affiliation: m.mentorProfile?.affiliation ?? m.mentorProfile?.campus, profilePhotoUrl: m.mentorProfile?.profilePhotoUrl ?? m.profilePhotoUrl ?? m.avatar, createdAt: m.createdAt };
}
const getMentorTable = async (_, res) => {
    try {
        const rows = await db.user.findMany({ where: { role: 'MENTOR' }, include: { mentorProfile: true }, orderBy: { createdAt: 'desc' } });
        return res.json({ mentors: rows.map(formatMentor) });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.getMentorTable = getMentorTable;
const getMentorTableByStatus = (status) => async (_, res) => {
    try {
        const rows = await db.user.findMany({ where: { role: 'MENTOR', mentorProfile: { verificationStatus: status } }, include: { mentorProfile: true }, orderBy: { createdAt: 'desc' } });
        return res.json({ mentors: rows.map(formatMentor) });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.getMentorTableByStatus = getMentorTableByStatus;
const getAdminUsers = async (_, res) => {
    try {
        const rows = await db.user.findMany({ where: { role: 'USER' }, select: userSelect, orderBy: { createdAt: 'desc' } });
        return res.json({ users: rows.map((u) => ({ ...u, school: u.nifesSchool, profileImage: u.profilePhotoUrl ?? u.avatar })) });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.getAdminUsers = getAdminUsers;
const getUsersByAssignment = (assigned) => async (_, res) => {
    try {
        const ids = await db.mentorshipRequest.findMany({ where: { status: 'ACCEPTED' }, select: { menteeId: true }, distinct: ['menteeId'] });
        const rows = await db.user.findMany({ where: { role: 'USER', id: assigned ? { in: ids.map((x) => x.menteeId) } : { notIn: ids.map((x) => x.menteeId) } }, select: userSelect });
        return res.json({ users: rows.map((u) => ({ ...u, school: u.nifesSchool, profileImage: u.profilePhotoUrl ?? u.avatar })) });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.getUsersByAssignment = getUsersByAssignment;
const getConferenceList = async (req, res) => {
    try {
        const archived = req.path.endsWith('/archived');
        const rows = await db.adminConference.findMany({ where: archived ? { status: 'archived' } : { status: { not: 'archived' } }, include: { _count: { select: { mentors: true, mentees: true, groups: true } }, groups: { where: { facilitatorId: null } } }, orderBy: { startDate: 'desc' } });
        return res.json({ programs: rows.map((p) => ({ id: p.id, name: p.name, year: p.year, zone: p.zone, startDate: p.startDate.toISOString().slice(0, 10), endDate: p.endDate.toISOString().slice(0, 10), status: p.status, mentorCount: p._count.mentors, menteeCount: p._count.mentees, assignedMenteeCount: 0, groupCount: p._count.groups, facilitatorsWithoutGroups: p.groups.length })) });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.getConferenceList = getConferenceList;
const createConference = async (req, res) => {
    try {
        const { name, year, zone, startDate, endDate, details, status = 'draft' } = req.body;
        if (!name || !year || !zone || !startDate || !endDate)
            return res.status(400).json({ message: 'name, year, zone, startDate and endDate are required' });
        const [mentees, mentors] = await Promise.all([db.user.findMany({ where: { role: 'USER' }, select: { id: true } }), db.user.findMany({ where: { role: 'MENTOR', mentorProfile: { verificationStatus: 'approved' } }, select: { id: true } })]);
        const p = await db.adminConference.create({ data: { name, year: Number(year), zone, startDate: asDate(startDate), endDate: asDate(endDate), details, status, mentees: { createMany: { data: mentees.map((u) => ({ menteeId: u.id })) } }, mentors: { createMany: { data: mentors.map((u) => ({ mentorId: u.id })) } } } });
        return res.status(201).json({ program: p });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.createConference = createConference;
const conferenceDetail = async (req, res) => {
    try {
        const p = await db.adminConference.findUnique({ where: { id: String(req.params.id) }, include: { _count: { select: { mentors: true, mentees: true, groups: true } } } });
        if (!p)
            return res.status(404).json({ message: 'Program not found' });
        return res.json({ program: p });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.conferenceDetail = conferenceDetail;
const archiveConference = async (req, res) => {
    try {
        const p = await db.adminConference.update({ where: { id: String(req.params.id) }, data: { status: 'archived' } });
        return res.json({ program: p });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.archiveConference = archiveConference;
const conferencePeople = (kind) => async (req, res) => {
    try {
        const id = String(req.params.id);
        const delegate = kind === 'mentors' ? db.conferenceMentor : db.conferenceMentee;
        const links = await delegate.findMany({ where: { conferenceId: id }, include: { [kind === 'mentors' ? 'mentor' : 'mentee']: { select: userSelect } } });
        const people = links.map((l) => kind === 'mentors' ? l.mentor : l.mentee);
        return res.json({ [kind]: people });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.conferencePeople = conferencePeople;
const getGroups = async (req, res) => {
    try {
        const groups = await db.adminGroup.findMany({ where: { conferenceId: String(req.params.id) }, include: { facilitator: { select: { name: true } }, members: { include: { mentee: { select: { id: true, name: true } } } } }, orderBy: { name: 'asc' } });
        return res.json({ groups: groups.map((g) => ({ id: g.id, name: g.name, facilitatorId: g.facilitatorId, facilitatorName: g.facilitator?.name ?? null, menteeCount: g.members.length, menteeIds: g.members.map((m) => m.menteeId), status: g.members.length ? 'assigned' : 'unassigned' })) });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.getGroups = getGroups;
const createGroup = async (req, res) => {
    try {
        const { name, facilitatorId, menteeIds = [] } = req.body;
        if (!name)
            return res.status(400).json({ message: 'name is required' });
        const group = await db.adminGroup.create({ data: { conferenceId: String(req.params.id), name, facilitatorId, members: { create: Array.isArray(menteeIds) ? menteeIds.map((menteeId) => ({ menteeId })) : [] } }, include: { members: true } });
        return res.status(201).json({ group });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.createGroup = createGroup;
const updateGroup = async (req, res) => {
    try {
        const { facilitatorId, menteeIds } = req.body;
        const groupId = String(req.params.groupId);
        const data = {};
        if (facilitatorId !== undefined)
            data.facilitatorId = facilitatorId || null;
        if (Array.isArray(menteeIds)) {
            await db.adminGroupMember.deleteMany({ where: { groupId } });
            data.members = { create: menteeIds.map((menteeId) => ({ menteeId })) };
        }
        const group = await db.adminGroup.update({ where: { id: groupId }, data, include: { members: true } });
        return res.json({ group });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.updateGroup = updateGroup;
const randomAssign = async (req, res) => {
    try {
        const conferenceId = String(req.params.id);
        const [groups, mentees] = await Promise.all([db.adminGroup.findMany({ where: { conferenceId }, include: { members: { include: { mentee: { select: { name: true } } } }, facilitator: { select: { name: true } } } }), db.conferenceMentee.findMany({ where: { conferenceId }, include: { mentee: { select: { id: true, name: true } } } })]);
        if (!groups.length)
            return res.status(400).json({ message: 'Create at least one group before assigning mentees' });
        const already = new Set(groups.flatMap((g) => g.members.map((m) => m.menteeId)));
        const available = mentees.filter((m) => !already.has(m.menteeId)).sort(() => Math.random() - .5);
        const proposed = Object.fromEntries(groups.map((g) => [g.id, []]));
        available.forEach((m, i) => proposed[groups[i % groups.length].id].push(m.mentee));
        return res.json({ preview: { preservedRelationships: already.size, newProposals: available.length, totalAllocated: already.size + available.length, mentorLedGroups: groups.filter((g) => g.facilitatorId).length, groups: groups.map((g) => ({ id: g.id, name: g.name, facilitatorName: g.facilitator?.name ?? '', size: g.members.length + proposed[g.id].length, preserved: g.members.length, proposed: proposed[g.id].length, members: [...g.members.map((m) => ({ id: m.menteeId, name: m.mentee.name, status: 'preserved' })), ...proposed[g.id].map((m) => ({ ...m, status: 'proposed' }))] })) } });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.randomAssign = randomAssign;
const confirmAssignments = async (req, res) => {
    try {
        const groups = Array.isArray(req.body?.groups) ? req.body.groups : [];
        await db.$transaction(groups.flatMap((g) => Array.isArray(g.menteeIds) ? g.menteeIds.map((menteeId) => db.adminGroupMember.upsert({ where: { groupId_menteeId: { groupId: g.id, menteeId } }, create: { groupId: g.id, menteeId }, update: {} })) : []));
        return res.json({ message: 'Assignments confirmed' });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.confirmAssignments = confirmAssignments;
const conferenceReport = async (req, res) => {
    try {
        const [totalMentors, totalMentees, groups] = await Promise.all([db.conferenceMentor.count({ where: { conferenceId: String(req.params.id) } }), db.conferenceMentee.count({ where: { conferenceId: String(req.params.id) } }), db.adminGroup.findMany({ where: { conferenceId: String(req.params.id) }, include: { _count: { select: { members: true } } } })]);
        const assignedMentees = groups.reduce((n, g) => n + g._count.members, 0);
        return res.json({ report: { totalMentors, assignedMentees, unassignedMentees: Math.max(totalMentees - assignedMentees, 0) } });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.conferenceReport = conferenceReport;
const getRecordedSessions = async (_, res) => {
    try {
        const sessions = await db.recordedSession.findMany({ include: { mentor: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
        return res.json({ sessions: sessions.map((s) => ({ ...s, mentorName: s.mentor?.name ?? null })) });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.getRecordedSessions = getRecordedSessions;
const createRecordedSession = async (req, res) => {
    try {
        const { title, description, series, mentorId, contentType, duration, keyTakeaways = [], status = 'draft', thumbnailUrl, mediaUrl } = req.body;
        if (!title || !contentType)
            return res.status(400).json({ message: 'title and contentType are required' });
        const session = await db.recordedSession.create({ data: { title, description, series, mentorId, contentType, duration, keyTakeaways, status, thumbnailUrl, mediaUrl } });
        return res.status(201).json({ session });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.createRecordedSession = createRecordedSession;
const updateRecordedSession = async (req, res) => {
    try {
        const data = { ...req.body };
        delete data.id;
        delete data.createdAt;
        const session = await db.recordedSession.update({ where: { id: String(req.params.id) }, data });
        return res.json({ session });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.updateRecordedSession = updateRecordedSession;
const deleteRecordedSession = async (req, res) => {
    try {
        await db.recordedSession.delete({ where: { id: String(req.params.id) } });
        return res.json({ message: 'Session deleted' });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.deleteRecordedSession = deleteRecordedSession;
const publishRecordedSession = async (req, res) => {
    try {
        const session = await db.recordedSession.update({ where: { id: String(req.params.id) }, data: { status: req.body?.status === 'draft' ? 'draft' : 'published' } });
        return res.json({ session });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.publishRecordedSession = publishRecordedSession;
const setSessionAsset = (field) => async (req, res) => {
    try {
        const url = req.file?.path ?? req.body?.url;
        if (!url)
            return res.status(400).json({ message: 'Upload a file or provide url' });
        const session = await db.recordedSession.update({ where: { id: String(req.params.id) }, data: { [field]: url } });
        return res.json({ session });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.setSessionAsset = setSessionAsset;
const getAdminProfile = async (req, res) => {
    try {
        const id = req.user.id;
        const admin = await db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, designation: true, role: true, phone: true, profilePhotoUrl: true } });
        if (!admin)
            return res.status(404).json({ message: 'Admin not found' });
        return res.json({ admin: { ...admin, role: admin.role === 'ADMIN' ? 'Super Admin' : admin.role } });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.getAdminProfile = getAdminProfile;
const updateAdminProfile = async (req, res) => {
    try {
        const { name, email, designation, phone, profilePhotoUrl } = req.body;
        const admin = await db.user.update({ where: { id: req.user.id }, data: { name, email, designation, phone, profilePhotoUrl }, select: { id: true, name: true, email: true, designation: true, role: true, phone: true, profilePhotoUrl: true } });
        return res.json({ admin });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.updateAdminProfile = updateAdminProfile;
const updateAdminPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword || String(newPassword).length < 8)
            return res.status(400).json({ message: 'Current password and a new password of at least 8 characters are required' });
        const admin = await db.user.findUnique({ where: { id: req.user.id } });
        if (!admin?.password || !(await bcryptjs_1.default.compare(currentPassword, admin.password)))
            return res.status(400).json({ message: 'Current password is incorrect' });
        await db.user.update({ where: { id: admin.id }, data: { password: await bcryptjs_1.default.hash(newPassword, 10) } });
        return res.json({ message: 'Password updated' });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.updateAdminPassword = updateAdminPassword;
const updateAdminNotifications = async (req, res) => {
    try {
        const allowed = ['mentorRegistrations', 'menteeRegistrations', 'conferenceNotifications', 'adminUpdates'];
        const prefs = {};
        for (const key of allowed)
            if (typeof req.body?.[key] === 'boolean')
                prefs[key] = req.body[key];
        const admin = await db.user.update({ where: { id: req.user.id }, data: { notificationPreferences: prefs }, select: { notificationPreferences: true } });
        return res.json({ notifications: admin.notificationPreferences });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.updateAdminNotifications = updateAdminNotifications;
