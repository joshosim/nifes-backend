import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateOTP, sendOTP } from '../utils/otp';
import { prisma } from '../config/database';
import type { AuthRequest } from '../middleware/auth.middleware';

const AUTH_COOKIE = 'unityflow_token';
const PASSWORD_RESET_CODE_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_REQUEST_COOLDOWN_MS = 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const passwordResetRequests = new Map<string, number>();
const passwordResetAttempts = new Map<string, { count: number; expiresAt: number }>();
const passwordResetRequestMessage =
  'If an account exists for that email, a password reset code has been sent.';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    const gender =
      typeof req.body.gender === 'string' ? req.body.gender.toUpperCase() : undefined;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (gender && !['MALE', 'FEMALE'].includes(gender)) {
      return res.status(400).json({ error: 'Gender must be MALE or FEMALE.' });
    }

    if (role === 'ADMIN') {
      return res.status(403).json({ error: 'Cannot register as admin' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    //utilizing bycrpyt.js to has password before saving to database
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        ...(role === 'USER' && gender ? { gender } : {}),
        otp,
        otpExpiry,
        isVerified: false,
      },
    });

    await sendOTP(email, otp);

    res.status(201).json({
      message: 'Registration initiated. Please verify OTP sent to your email.',
      email: user.email,

    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
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

    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        otp: null,
        otpExpiry: null,
      }
    })

    res.json({
      message: "Account verified successfully! You can now log in.",
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });

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
    const isValidPassword = await bcrypt.compare(password, user.password!);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      ...(user.role === 'ADMIN' ? { admin: { id: user.id, name: user.name, email: user.email, role: 'Super Admin' } } : {}),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const requestNewOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'User already verified' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { email },
      data: {
        otp,
        otpExpiry,
      }
    });

    await sendOTP(email, otp);

    res.json({
      message: 'New OTP sent to your email.',
    });
  } catch (error) {
    console.error('Request new OTP error:', error);
    res.status(500).json({ error: 'Failed to request new OTP' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase();
    const now = Date.now();
    for (const [key, requestedAt] of passwordResetRequests) {
      if (now - requestedAt >= PASSWORD_RESET_REQUEST_COOLDOWN_MS) {
        passwordResetRequests.delete(key);
      }
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.isVerified) {
      const lastRequest = passwordResetRequests.get(normalizedEmail);
      if (
        lastRequest === undefined ||
        now - lastRequest >= PASSWORD_RESET_REQUEST_COOLDOWN_MS
      ) {
        const otp = generateOTP();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const otpExpiry = new Date(now + PASSWORD_RESET_CODE_TTL_MS);

        await prisma.user.update({
          where: { id: user.id },
          data: { otp: hashedOtp, otpExpiry },
        });
        await sendOTP(user.email, otp, 'password_reset');
        passwordResetRequests.set(normalizedEmail, now);
        passwordResetAttempts.delete(normalizedEmail);
      }
    }

    return res.json({ message: passwordResetRequestMessage });
  } catch (error) {
    console.error('Request password reset error:', error);
    return res.status(500).json({ error: 'Failed to request password reset' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';
    const newPassword =
      typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        error: 'Email, reset code, and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const invalidCodeResponse = {
      error: 'The reset code is invalid or expired. Request a new code and try again.',
    };
    const user = await prisma.user.findUnique({ where: { email } });
    const now = Date.now();
    const normalizedEmail = user?.email.toLowerCase() ?? email.toLowerCase();
    const currentAttempts = passwordResetAttempts.get(normalizedEmail);

    if (currentAttempts && currentAttempts.expiresAt > now) {
      if (currentAttempts.count >= PASSWORD_RESET_MAX_ATTEMPTS) {
        return res.status(429).json({
          error: 'Too many incorrect reset codes. Request a new code.',
        });
      }
    } else if (currentAttempts) {
      passwordResetAttempts.delete(normalizedEmail);
    }

    if (
      !user?.isVerified ||
      !user.otp ||
      !user.otpExpiry ||
      user.otpExpiry.getTime() <= now
    ) {
      passwordResetAttempts.delete(normalizedEmail);
      return res.status(400).json(invalidCodeResponse);
    }

    if (!(await bcrypt.compare(otp, user.otp))) {
      const count =
        currentAttempts?.expiresAt === user.otpExpiry.getTime()
          ? currentAttempts.count + 1
          : 1;

      if (count >= PASSWORD_RESET_MAX_ATTEMPTS) {
        await prisma.user.update({
          where: { id: user.id },
          data: { otp: null, otpExpiry: null },
        });
      }

      passwordResetAttempts.set(normalizedEmail, {
        count,
        expiresAt: user.otpExpiry.getTime(),
      });
      return res.status(400).json(invalidCodeResponse);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpiry: null,
      }
    });
    passwordResetAttempts.delete(normalizedEmail);
    passwordResetRequests.delete(normalizedEmail);

    res.json({
      message: 'Password reset successfully!',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

//Google OAuth callback handler
export const google0AuthCallback = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    if (!user) {
      return res.status(401).json({ error: 'Google authentication failed' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role ?? 'user' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const loginResponse = {
      message: 'Google login successful',
      token,
      user: sanitizeUser(user),
    };
    if (!(req.get('accept') ?? '').includes('text/html')) {
      return res.status(200).json(loginResponse);
    }

    const frontendOrigin = new URL(
      process.env.GOOGLE_FRONTEND_URL ?? 'http://localhost:3000',
    );
    if (!['http:', 'https:'].includes(frontendOrigin.protocol)) {
      return res.status(500).json({ error: 'Google frontend URL must use HTTP or HTTPS' });
    }

    const cookieDomain = process.env.AUTH_COOKIE_DOMAIN;
    res.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });

    return res.redirect(new URL('/auth/google/complete', frontendOrigin).toString());

  } catch (error) {
    return res.status(500).json({ error: 'Server error during Google callback' });
  }
}

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        nifesZone: true,
        nifesSchool: true,
        unit: true,
        wing: true,
        courseOfStudy: true,
        level: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ error: 'Unable to load current user' });
  }
};

// ── Helper: safe user response (no sensitive fields) ─────────
const sanitizeUser = (user: any) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  avatar: user.avatar,
  authProvider: user.authProvider,
});

export const appleLogin = async (req: Request, res: Response) => {
  try {

  } catch (error) {

  }
}
