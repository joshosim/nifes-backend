"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appleLogin = exports.google0AuthCallback = exports.resetPassword = exports.requestNewOTP = exports.login = exports.verifyOTP = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const otp_1 = require("../utils/otp");
const database_1 = require("../config/database");
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Name, email, password, and role are required' });
        }
        const existingUser = await database_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        //utilizing bycrpyt.js to has password before saving to database
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const otp = (0, otp_1.generateOTP)();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        const user = await database_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                otp,
                otpExpiry,
                isVerified: false,
            },
        });
        await (0, otp_1.sendOTP)(email, otp);
        res.status(201).json({
            message: 'Registration initiated. Please verify OTP sent to your email.',
            email: user.email,
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};
exports.register = register;
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }
        const user = await database_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.isVerified) {
            return res.status(400).json({ error: 'User already verified' });
        }
        if (!user.otp || !user.otpExpiry) {
            return res.status(400).json({ error: 'No OTP found. Please register again.' });
        }
        if (new Date() > user.otpExpiry) {
            return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
        }
        if (user.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }
        await database_1.prisma.user.update({
            where: { email },
            data: {
                isVerified: true,
                otp: null,
                otpExpiry: null,
            }
        });
        res.json({
            message: "Account verified successfully! You can now log in.",
        });
    }
    catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'OTP verification failed' });
    }
};
exports.verifyOTP = verifyOTP;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Find user
        const user = await database_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        //check if user is verified
        if (!user.isVerified) {
            return res.status(403).json({
                error: "Please verify your email before logging in"
            });
        }
        // Check password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }
        // Generate token
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};
exports.login = login;
const requestNewOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const user = await database_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.isVerified) {
            return res.status(400).json({ error: 'User already verified' });
        }
        const otp = (0, otp_1.generateOTP)();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await database_1.prisma.user.update({
            where: { email },
            data: {
                otp,
                otpExpiry,
            }
        });
        await (0, otp_1.sendOTP)(email, otp);
        res.json({
            message: 'New OTP sent to your email.',
        });
    }
    catch (error) {
        console.error('Request new OTP error:', error);
        res.status(500).json({ error: 'Failed to request new OTP' });
    }
};
exports.requestNewOTP = requestNewOTP;
const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            return res.status(400).json({
                error: 'Email and new password are required'
            });
        }
        //lets check if the user exist first so we can change the password
        const user = await database_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await database_1.prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                otp: null,
                otpExpiry: null,
            }
        });
        res.json({
            message: 'Password reset successfully!',
        });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};
exports.resetPassword = resetPassword;
//Google OAuth callback handler
const google0AuthCallback = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Google authentication failed' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role ?? 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({
            message: 'Google login successful',
            token,
            user: sanitizeUser(user)
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error during Google callback' });
    }
};
exports.google0AuthCallback = google0AuthCallback;
// ── Helper: safe user response (no sensitive fields) ─────────
const sanitizeUser = (user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    authProvider: user.authProvider,
});
const appleLogin = async (req, res) => {
    try {
    }
    catch (error) {
    }
};
exports.appleLogin = appleLogin;
