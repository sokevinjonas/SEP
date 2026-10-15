"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_js_1 = require("./config.js");
const auth_routes_js_1 = require("./routes/auth.routes.js");
const sync_routes_js_1 = require("./routes/sync.routes.js");
const chat_routes_js_1 = require("./routes/chat.routes.js");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
exports.app.use(express_1.default.json({ limit: '10mb' }));
exports.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health check endpoint
exports.app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Student Savings Backend (Node.js/Express)',
        env: config_js_1.config.nodeEnv,
        time: new Date().toISOString()
    });
});
// Mount modular routers
exports.app.use('/api/auth', auth_routes_js_1.authRouter);
exports.app.use('/api', sync_routes_js_1.syncRouter);
exports.app.use('/api', chat_routes_js_1.chatRouter);
// Root fallback
exports.app.get('/', (req, res) => {
    res.send('Student Savings API is running.');
});
// Standalone server launch when executed directly
if (process.env.NODE_ENV !== 'test' && !process.env.NETLIFY) {
    exports.app.listen(config_js_1.config.port, () => {
        console.log(`\n🚀 Student Savings Node.js Backend is running at http://localhost:${config_js_1.config.port}`);
        console.log(`📡 Health check: http://localhost:${config_js_1.config.port}/api/health`);
        console.log(`🔐 OTP Auth: http://localhost:${config_js_1.config.port}/api/auth/send-otp\n`);
    });
}
