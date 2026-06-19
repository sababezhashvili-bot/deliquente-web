import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDB } from './db.js';
import { dataRouter }   from './routes/data.js';
import { uploadRouter } from './routes/upload.js';

const app  = express();
const PORT = process.env.PORT ?? 3001;

/* ── CORS: allow both production domains + localhost dev ── */
const allowed = [
  'https://sabe.studio',
  'https://www.sabe.studio',
  'https://sababezhashvili.com',
  'https://www.sababezhashvili.com',
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (Vercel rewrites, curl, etc.)
    if (!origin) return cb(null, true);
    if (allowed.includes(origin) || /localhost|127\.0\.0\.1/.test(origin)) {
      return cb(null, true);
    }
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

/* ── Body parsers ── */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ── Routes ── */
app.use('/api/data',   dataRouter);
app.use('/api/upload', uploadRouter);

/* ── Health check ── */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'deliquente-api', ts: Date.now() });
});

/* ── 404 catch-all ── */
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

/* ── Global error handler ── */
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

/* ── Start: listen first, then connect DB ── */
app.listen(PORT, async () => {
  console.log(`🚀  Deliquente API running on port ${PORT}`);
  try {
    await initDB();
    console.log('✅  Database connected');
  } catch (err) {
    console.error('⚠️  DB init failed — API running without DB:', err.message);
    // Server stays up; DB-dependent routes will return 503 gracefully
  }
});
