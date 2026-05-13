"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userProfile = exports.getOneUser = exports.getUsers = void 0;
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
const userProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const user_profile = await database_1.prisma.user.findUnique({
            where: { id: String(id) }
        });
        if (!user_profile) {
            return res.status(404).json({ error: "User not found" });
        }
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};
exports.userProfile = userProfile;
