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
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const mentorship_routes_1 = __importDefault(require("./routes/mentorship.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const conference_routes_1 = __importDefault(require("./routes/conference.routes"));
const session_routes_1 = __importDefault(require("./routes/session.routes"));
const passport_1 = __importDefault(require("./config/passport"));
const chat_socket_1 = require("./sockets/chat.socket");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
(0, database_1.connectDB)();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(passport_1.default.initialize());
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/mentors', mentor_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/chat', chat_routes_1.default);
app.use('/api/mentorship', mentorship_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/conferences', conference_routes_1.default);
app.use('/api/sessions', session_routes_1.default);
// Socket.io
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    (0, chat_socket_1.registerChatHandlers)(io, socket);
});
// ONE server — httpServer handles both HTTP and WebSocket
const PORT = process.env.PORT || 5000;
const server = httpServer.listen(PORT, () => {
    console.log(`🚀 NIFES API running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
process.on('unhandledRejection', async (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(async () => {
        await (0, database_1.disconnectDB)();
        process.exit(1);
    });
});
process.on('uncaughtException', async (err) => {
    console.error('Uncaught Exception:', err);
    await (0, database_1.disconnectDB)();
    process.exit(1);
});
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(async () => {
        await (0, database_1.disconnectDB)();
        process.exit(0);
    });
});
