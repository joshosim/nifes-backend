import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error']
});

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('Prisma connected successfully to DB');
  } catch (error) {
    console.error('Prisma connection error:', error);
    process.exit(1);
  }
};
const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    console.log('Prisma disconnected successfully');
  } catch (error) {
    console.error('Prisma disconnection error:', error);
    process.exit(1);
  }
};

export { connectDB, disconnectDB, prisma };