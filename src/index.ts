import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, disconnectDB, prisma } from './config/database';
import authRoutes from './routes/auth.routes';

//this imports the .env data into this project in this index.ts
dotenv.config();
connectDB()

//setting up the app with expressjs
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;

// Connect to Prisma and start server

const server = app.listen(PORT, () => {
  console.log(`🚀 NIFES API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

process.on("unhandledRejection", async (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(async () => {
    await disconnectDB();
    process.exit(1);
  })

});

process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception:", err);
  await disconnectDB();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(async () => {
    await disconnectDB();
    process.exit(1);
  })
});