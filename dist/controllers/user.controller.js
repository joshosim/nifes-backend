"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getOneUser = exports.getUsers = void 0;
const database_1 = require("../config/database");
const getUsers = async (req, res) => {
    try {
        const users = await database_1.prisma.user.findMany();
        res.json({ users });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};
exports.getUsers = getUsers;
const getOneUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await database_1.prisma.user.findUnique({
            where: { id: String(id) }
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
        const { name, avatar, nifesZone, nifesSchool, unit, wing, courseOfStudy, level } = req.body;
        const avatarUrl = req.file ? req.file.path : avatar;
        const ifThereIsExisitingUser = await database_1.prisma.user.findUnique({
            where: { id: String(id) }
        });
        if (!ifThereIsExisitingUser) {
            return res.status(404).json({ error: "User not found" });
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
