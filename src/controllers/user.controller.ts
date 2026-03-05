import { Request, Response } from 'express';
import { prisma } from '../config/database';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getOneUser = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
