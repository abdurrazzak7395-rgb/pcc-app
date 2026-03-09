import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { prisma } from './lib/prisma.js';
import { authRouter } from './routes/auth.js';
import { svpRouter } from './routes/svp.js';
import { meRouter } from './routes/me.js';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const origins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function(origin, cb){
    if (!origin) return cb(null, true); // curl/postman
    if (origins.length === 0) return cb(null, true);
    return cb(null, origins.includes(origin));
  },
  credentials: true,
}));

// Rate limit auth endpoints
app.use('/api/auth', rateLimit({ windowMs: 60_000, max: 30 }));

app.get('/health', (_, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api', meRouter);
app.use('/api/svp', svpRouter);

// global error handler
app.use((err, req, res, next) => {
  const status = err?.statusCode || err?.status || 500;
  res.status(status).json({
    message: err?.message || 'Server error',
    details: err?.details,
  });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
