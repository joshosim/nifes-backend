"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./config/database");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const mentor_routes_1 = __importDefault(require("./routes/mentor.routes"));
const passport_1 = __importDefault(require("./config/passport"));
(0, database_1.connectDB)();
//setting up the app with expressjs
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(passport_1.default.initialize());
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/mentors', mentor_routes_1.default);
const PORT = process.env.PORT || 5000;
// Connect to Prisma and start server
const server = app.listen(PORT, () => {
    console.log(`🚀 NIFES API running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
process.on("unhandledRejection", async (err) => {
    console.error("Unhandled Rejection:", err);
    server.close(async () => {
        await (0, database_1.disconnectDB)();
        process.exit(1);
    });
});
process.on("uncaughtException", async (err) => {
    console.error("Uncaught Exception:", err);
    await (0, database_1.disconnectDB)();
    process.exit(1);
});
process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully...");
    server.close(async () => {
        await (0, database_1.disconnectDB)();
        process.exit(1);
    });
});
