"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const conference_controller_1 = require("../controllers/conference.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get('/', conference_controller_1.getPublishedSessions);
exports.default = router;
