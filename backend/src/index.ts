import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.routes.js';
import { syncRouter } from './routes/sync.routes.js';
import { chatRouter } from './routes/chat.routes.js';

export const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Student Savings Backend (Node.js/Express)',
    env: config.nodeEnv,
    time: new Date().toISOString()
  });
});

// Mount modular routers
app.use('/api/auth', authRouter);
app.use('/api', syncRouter);
app.use('/api', chatRouter);

// Root fallback
app.get('/', (req, res) => {
  res.send('Student Savings API is running.');
});

// Standalone server launch when executed directly
if (process.env.NODE_ENV !== 'test' && !process.env.NETLIFY) {
  app.listen(config.port, () => {
    console.log(`\n🚀 Student Savings Node.js Backend is running at http://localhost:${config.port}`);
    console.log(`📡 Health check: http://localhost:${config.port}/api/health`);
    console.log(`🔐 OTP Auth: http://localhost:${config.port}/api/auth/send-otp\n`);
  });
}
