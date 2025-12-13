import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import usersRouter from './routes/users.js';
import settingsRouter from './routes/settings.js';
import sessionsRouter from './routes/sessions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later.'
});

// Stricter rate limit for write operations
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 write requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many write requests from this IP, please try again later.'
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/users', usersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/sessions', sessionsRouter);

// Apply stricter rate limiting to write operations
app.post('/api/users', writeLimiter);
app.post('/api/sessions', writeLimiter);
app.put('/api/settings/:userId', writeLimiter);
app.delete('/api/users/:userId', writeLimiter);
app.delete('/api/sessions/:sessionId', writeLimiter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Accepting requests from: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
