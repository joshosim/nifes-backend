"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAttendance = exports.updateProfile = exports.getOneUser = exports.getOneMentor = exports.getUsers = exports.getMentors = void 0;
const database_1 = require("../config/database");
const getRequestUser = (req) => req.user;
const getMentors = async (req, res) => {
    try {
        const mentors = await database_1.prisma.user.findMany({
            where: {
                role: 'MENTOR',
                mentorProfile: {
                    is: { verificationStatus: 'approved', isOnboardingComplete: true },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                mentorProfile: true,
            },
        });
        res.json({ mentors });
    }
    catch (error) {
        console.error('Error fetching mentors:', error);
        res.status(500).json({ error: 'Failed to fetch mentors' });
    }
};
exports.getMentors = getMentors;
const getUsers = async (req, res) => {
    try {
        const users = await database_1.prisma.user.findMany({
            where: { role: 'USER' },
            select: {
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
                gender: true,
                createdAt: true,
            },
        });
        res.json({ users });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};
exports.getUsers = getUsers;
const getOneMentor = async (req, res) => {
    try {
        const { id } = req.params;
        const mentor = await database_1.prisma.user.findUnique({
            where: { id: String(id) },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
                mentorProfile: true,
            },
        });
        if (!mentor) {
            return res.status(404).json({ error: 'Mentor not found' });
        }
        if (mentor.role !== 'MENTOR') {
            return res.status(400).json({ error: 'User is not a mentor' });
        }
        if (mentor.mentorProfile?.verificationStatus !== 'approved' ||
            !mentor.mentorProfile.isOnboardingComplete) {
            return res.status(404).json({ error: 'Mentor not found' });
        }
        res.json({ mentor });
    }
    catch (error) {
        console.error('Error fetching mentor:', error);
        res.status(500).json({ error: 'Failed to fetch mentor' });
    }
};
exports.getOneMentor = getOneMentor;
const getOneUser = async (req, res) => {
    try {
        const { id } = req.params;
        const requestUser = getRequestUser(req);
        if (requestUser?.id !== String(id) && requestUser?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You can only view your own profile' });
        }
        const user = await database_1.prisma.user.findUnique({
            where: { id: String(id) },
            select: {
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
                gender: true,
                createdAt: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};
exports.getOneUser = getOneUser;
const updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, avatar, nifesZone, nifesSchool, unit, wing, courseOfStudy, level, gender } = req.body;
        const avatarUrl = req.file ? req.file.path : avatar;
        const ifThereIsExisitingUser = await database_1.prisma.user.findUnique({
            where: { id: String(id) }
        });
        if (!ifThereIsExisitingUser) {
            return res.status(404).json({ error: "User not found" });
        }
        const requestUser = getRequestUser(req);
        if (requestUser?.id !== String(id) && requestUser?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You can only update your own profile' });
        }
        if (gender !== undefined &&
            gender !== '' &&
            !['MALE', 'FEMALE'].includes(String(gender).toUpperCase())) {
            return res.status(400).json({ error: 'Gender must be MALE, FEMALE, or empty.' });
        }
        const updatedUser = await database_1.prisma.user.update({
            where: { id: String(id) },
            data: {
                ...(name !== undefined && { name }),
                ...(avatarUrl !== undefined && { avatar: avatarUrl }),
                ...(nifesZone !== undefined && { nifesZone }),
                ...(nifesSchool !== undefined && { nifesSchool }),
                ...(unit !== undefined && { unit }),
                ...(wing !== undefined && { wing }),
                ...(courseOfStudy !== undefined && { courseOfStudy }),
                ...(level !== undefined && { level }),
                ...(gender !== undefined && { gender: gender ? String(gender).toUpperCase() : null }),
            },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                nifesZone: true,
                nifesSchool: true,
                unit: true,
                wing: true,
                courseOfStudy: true,
                level: true,
                gender: true,
                role: true,
                isVerified: true,
            },
        });
        return res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};
exports.updateProfile = updateProfile;
const markAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        //let get to work
    }
    catch (error) {
        console.error("error:", error);
    }
};
exports.markAttendance = markAttendance;
