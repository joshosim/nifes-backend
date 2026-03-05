import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateOTP, sendOTP } from '../utils/otp';
import { prisma } from '../config/database';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
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
    const isValidPassword = await bcrypt.compare(password, user.password);

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
