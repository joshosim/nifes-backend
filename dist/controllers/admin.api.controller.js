"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdminNotifications = exports.updateAdminPassword = exports.updateAdminProfile = exports.getAdminProfile = exports.setSessionAsset = exports.publishRecordedSession = exports.deleteRecordedSession = exports.updateRecordedSession = exports.createRecordedSession = exports.getRecordedSessions = exports.conferenceReport = exports.confirmAssignments = exports.randomAssign = exports.updateGroup = exports.createGroup = exports.getGroups = exports.conferencePeople = exports.archiveConference = exports.conferenceDetail = exports.publishConference = exports.createConference = exports.getConferenceList = exports.getUsersByAssignment = exports.getAdminUsers = exports.getMentorTableByStatus = exports.getMentorTable = exports.addMentor = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const conference_assignment_1 = require("../utils/conference-assignment");
const db = database_1.prisma;
const userSelect = { id: true, name: true, email: true, phone: true, nifesSchool: true, courseOfStudy: true, level: true, avatar: true, profilePhotoUrl: true, createdAt: true };
const asDate = (value) => {
    const date = new Date(String(value));
    if (!Number.isFinite(date.getTime()))
        throw new Error('Invalid date');
    return date;
};
const err = (res, error) => res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
async function notifyConferenceRegistrants(tx, conferenceName) {
    const recipients = await tx.user.findMany({
        where: {
            isVerified: true,
            OR: [
                { role: 'USER' },
                {
                    role: 'MENTOR',
                    mentorProfile: { verificationStatus: 'approved', isOnboardingComplete: true },
                },
            ],
        },
        select: { id: true },
    });
    if (!recipients.length)
        return;
    await tx.notification.createMany({
        data: recipients.map((recipient) => ({
            userId: recipient.id,
            title: 'Conference registration is open',
            body: `${conferenceName} registration is now open. Visit Sessions in UnityFlow to register.`,
        })),
    });
}
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
    return { id: m.id, name: m.name, email: m.email, phone: m.phone, verificationStatus: m.mentorProfile?.verificationStatus ?? 'pending', isOnboardingComplete: m.mentorProfile?.isOnboardingComplete ?? false, availabilityStatus: m.mentorProfile?.isAvailable ? 'Active' : 'Inactive', focusAreas: m.mentorProfile?.focusAreas ?? [], affiliation: m.mentorProfile?.affiliation ?? m.mentorProfile?.campus, profilePhotoUrl: m.mentorProfile?.profilePhotoUrl ?? m.profilePhotoUrl ?? m.avatar, createdAt: m.createdAt };
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
        const rows = await db.user.findMany({ where: { role: 'MENTOR', mentorProfile: { verificationStatus: status, ...(status === 'pending' ? { isOnboardingComplete: true } : {}) } }, include: { mentorProfile: true }, orderBy: { createdAt: 'desc' } });
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
        const { name, year, zone, startDate, endDate, details } = req.body;
        const status = req.body.status === 'active' ? 'active' : 'draft';
        if (!name || !year || !zone || !startDate || !endDate) {
            return res.status(400).json({ message: 'name, year, zone, startDate and endDate are required' });
        }
        const start = asDate(startDate);
        const end = asDate(endDate);
        if (end < start)
            return res.status(400).json({ message: 'endDate must be on or after startDate' });
        const conference = await db.$transaction(async (tx) => {
            const created = await tx.adminConference.create({
                data: {
                    name: String(name).trim(),
                    year: Number(year),
                    zone: String(zone).trim(),
                    startDate: start,
                    endDate: end,
                    details,
                    status,
                },
            });
            if (status === 'active')
                await notifyConferenceRegistrants(tx, created.name);
            return created;
        });
        return res.status(201).json({ program: conference });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.createConference = createConference;
const publishConference = async (req, res) => {
    try {
        const conferenceId = String(req.params.id);
        const conference = await db.adminConference.findUnique({ where: { id: conferenceId } });
        if (!conference)
            return res.status(404).json({ message: 'Conference not found.' });
        if (conference.status === 'active')
            return res.json({ program: conference });
        if (conference.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft conferences can be published.' });
        }
        const existingActive = await db.adminConference.findFirst({
            where: { status: 'active', id: { not: conferenceId } },
            select: { id: true, name: true },
        });
        if (existingActive) {
            return res.status(409).json({
                message: `Archive ${existingActive.name} before publishing another active conference.`,
            });
        }
        const published = await db.$transaction(async (tx) => {
            const updated = await tx.adminConference.update({
                where: { id: conferenceId },
                data: { status: 'active' },
            });
            await notifyConferenceRegistrants(tx, updated.name);
            return updated;
        });
        return res.json({ program: published });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.publishConference = publishConference;
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
        const conferenceId = String(req.params.id);
        if (!name || !facilitatorId)
            return res.status(400).json({ message: 'name and facilitatorId are required' });
        const mentorRegistration = await db.conferenceMentor.findUnique({
            where: { conferenceId_mentorId: { conferenceId, mentorId: String(facilitatorId) } },
        });
        if (!mentorRegistration)
            return res.status(400).json({ message: 'The facilitator must be registered for this conference.' });
        const memberIds = Array.isArray(menteeIds) ? menteeIds.map(String) : [];
        if (new Set(memberIds).size !== memberIds.length) {
            return res.status(400).json({ message: 'A mentee cannot be added to the same group more than once.' });
        }
        if (memberIds.length) {
            const registrations = await db.conferenceMentee.findMany({
                where: { conferenceId, menteeId: { in: memberIds } },
                select: { menteeId: true },
            });
            if (registrations.length !== memberIds.length) {
                return res.status(400).json({ message: 'Every group member must be registered for this conference.' });
            }
        }
        const group = await db.adminGroup.create({
            data: {
                conferenceId,
                name: String(name).trim(),
                facilitatorId: String(facilitatorId),
                members: { create: memberIds.map((menteeId) => ({ menteeId })) },
            },
            include: { members: true },
        });
        return res.status(201).json({ group });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.createGroup = createGroup;
const updateGroup = async (req, res) => {
    try {
        const conferenceId = String(req.params.id);
        const groupId = String(req.params.groupId);
        const { facilitatorId, menteeIds } = req.body;
        const existing = await db.adminGroup.findFirst({ where: { id: groupId, conferenceId } });
        if (!existing)
            return res.status(404).json({ message: 'Group not found for this conference.' });
        const data = {};
        if (facilitatorId !== undefined) {
            if (facilitatorId) {
                const registration = await db.conferenceMentor.findUnique({
                    where: { conferenceId_mentorId: { conferenceId, mentorId: String(facilitatorId) } },
                });
                if (!registration)
                    return res.status(400).json({ message: 'The facilitator must be registered for this conference.' });
            }
            data.facilitatorId = facilitatorId || null;
        }
        if (Array.isArray(menteeIds)) {
            const memberIds = menteeIds.map(String);
            if (new Set(memberIds).size !== memberIds.length) {
                return res.status(400).json({ message: 'A mentee cannot be added to the same group more than once.' });
            }
            if (memberIds.length) {
                const registrations = await db.conferenceMentee.findMany({
                    where: { conferenceId, menteeId: { in: memberIds } },
                    select: { menteeId: true },
                });
                if (registrations.length !== memberIds.length) {
                    return res.status(400).json({ message: 'Every group member must be registered for this conference.' });
                }
            }
            data.members = { create: memberIds.map((menteeId) => ({ menteeId })) };
        }
        const group = await db.$transaction(async (tx) => {
            if (Array.isArray(menteeIds)) {
                await tx.adminGroupMember.deleteMany({ where: { groupId } });
            }
            return tx.adminGroup.update({
                where: { id: groupId },
                data,
                include: { members: true },
            });
        });
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
        const [groups, mentees, mentorRegistrations] = await Promise.all([
            db.adminGroup.findMany({
                where: { conferenceId },
                include: {
                    members: { include: { mentee: { select: { id: true, name: true, gender: true } } } },
                    facilitator: { select: { name: true } },
                },
            }),
            db.conferenceMentee.findMany({
                where: { conferenceId },
                include: { mentee: { select: { id: true, name: true, gender: true } } },
            }),
            db.conferenceMentor.findMany({
                where: {
                    conferenceId,
                    mentor: { mentorProfile: { verificationStatus: 'approved', isOnboardingComplete: true } },
                },
                include: { mentor: { select: { id: true, name: true } } },
            }),
        ]);
        const already = new Set(groups.flatMap((g) => g.members.map((m) => m.menteeId)));
        const available = mentees
            .filter((mentee) => !already.has(mentee.menteeId))
            .map((mentee) => mentee.mentee);
        const preview = (0, conference_assignment_1.createBalancedAssignmentPreview)(groups.map((group) => ({
            ...group,
            facilitatorName: group.facilitator?.name ?? null,
        })), mentorRegistrations.map((registration) => registration.mentor), available);
        if (!preview) {
            return res.status(400).json({
                message: 'At least one approved, registered mentor is needed before assigning mentees.',
            });
        }
        if (preview.groups.some((group) => !group.facilitatorId)) {
            return res.status(400).json({
                message: 'Assign a registered mentor to each existing group before shuffling mentees.',
            });
        }
        return res.json({ preview });
    }
    catch (e) {
        return err(res, e);
    }
};
exports.randomAssign = randomAssign;
const confirmAssignments = async (req, res) => {
    try {
        const conferenceId = String(req.params.id);
        const groups = Array.isArray(req.body?.groups) ? req.body.groups : [];
        if (!groups.length)
            return res.status(400).json({ message: 'Assignment groups are required.' });
        const [conferenceMentees, conferenceMentors, existingGroups, existingMembers] = await Promise.all([
            db.conferenceMentee.findMany({ where: { conferenceId }, select: { menteeId: true } }),
            db.conferenceMentor.findMany({ where: { conferenceId }, select: { mentorId: true } }),
            db.adminGroup.findMany({ where: { conferenceId }, select: { id: true } }),
            db.adminGroupMember.findMany({
                where: { group: { conferenceId } },
                select: { groupId: true, menteeId: true },
            }),
        ]);
        const allowedMenteeIds = new Set(conferenceMentees.map((row) => row.menteeId));
        const allowedMentorIds = new Set(conferenceMentors.map((row) => row.mentorId));
        const existingGroupIds = new Set(existingGroups.map((group) => group.id));
        const assignedToGroup = new Map(existingMembers.map((member) => [member.menteeId, member.groupId]));
        const submittedMenteeIds = new Set();
        for (const group of groups) {
            if (typeof group.id !== 'string' ||
                typeof group.name !== 'string' ||
                typeof group.facilitatorId !== 'string' ||
                !allowedMentorIds.has(group.facilitatorId) ||
                !Array.isArray(group.menteeIds)) {
                return res.status(400).json({ message: 'Assignment group data is invalid.' });
            }
            for (const menteeId of group.menteeIds) {
                if (typeof menteeId !== 'string' ||
                    !allowedMenteeIds.has(menteeId) ||
                    submittedMenteeIds.has(menteeId) ||
                    (assignedToGroup.has(menteeId) && assignedToGroup.get(menteeId) !== group.id)) {
                    return res.status(400).json({ message: 'A mentee is invalid or assigned to multiple groups.' });
                }
                submittedMenteeIds.add(menteeId);
            }
        }
        const submittedExistingIds = groups
            .map((group) => group.id)
            .filter((id) => existingGroupIds.has(id));
        const matchedExisting = await db.adminGroup.findMany({
            where: { conferenceId, id: { in: submittedExistingIds } },
            select: { id: true },
        });
        if (matchedExisting.length !== submittedExistingIds.length) {
            return res.status(400).json({ message: 'An assignment group does not belong to this conference.' });
        }
        await db.$transaction(async (tx) => {
            for (const group of groups) {
                if (existingGroupIds.has(group.id)) {
                    await tx.adminGroup.update({
                        where: { id: group.id },
                        data: { facilitatorId: group.facilitatorId },
                    });
                }
                else {
                    await tx.adminGroup.create({
                        data: {
                            id: group.id,
                            conferenceId,
                            name: group.name,
                            facilitatorId: group.facilitatorId,
                        },
                    });
                }
                for (const menteeId of group.menteeIds) {
                    await tx.adminGroupMember.upsert({
                        where: { groupId_menteeId: { groupId: group.id, menteeId } },
                        create: { groupId: group.id, menteeId },
                        update: {},
                    });
                }
            }
        });
        return res.json({ message: 'Assignments confirmed.' });
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
