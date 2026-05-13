"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.disconnectDB = exports.connectDB = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error']
});
exports.prisma = prisma;
const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log('Prisma connected successfully to DB');
    }
    catch (error) {
        console.error('Prisma connection error:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    try {
        await prisma.$disconnect();
        console.log('Prisma disconnected successfully');
    }
    catch (error) {
        console.error('Prisma disconnection error:', error);
        process.exit(1);
    }
};
exports.disconnectDB = disconnectDB;
