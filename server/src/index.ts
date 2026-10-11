import express from 'express';
import cors from 'cors';
import { CONFIG } from './config.js';
import { initDatabase } from './db/index.js';
import { authMiddleware } from './middleware/auth.js';
import apiRouter from './routes/api.js';

const app = express();

// Security and CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request body size limits (prevents payload exhaustion)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Authentication middleware applied across /api routes
app.use('/api', authMiddleware, apiRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

async function startServer() {
  try {
    await initDatabase();
    app.listen(CONFIG.PORT, () => {
      console.log(`=======================================================`);
      console.log(`  Smart Compiler Backend Server is running!`);
      console.log(`  Local URL: http://localhost:${CONFIG.PORT}`);
      console.log(`  Environment: ${CONFIG.NODE_ENV}`);
      console.log(`  AI Provider: ${CONFIG.AI.PROVIDER} (Key configured: ${!!CONFIG.AI.API_KEY})`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
