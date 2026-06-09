import { Router } from 'express';
import { getSiteData, setSiteData } from '../db.js';

export const dataRouter = Router();

/* ─────────────────────────────────────────────
   GET /api/data  — public, returns site JSON
───────────────────────────────────────────── */
dataRouter.get('/', async (req, res) => {
  try {
    const data = await getSiteData();
    res.json(data); // null if DB is empty (first run)
  } catch (err) {
    console.error('GET /api/data error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ─────────────────────────────────────────────
   PUT /api/data  — admin only, saves full JSON
   Body: { password: string, data: object }
───────────────────────────────────────────── */
dataRouter.put('/', async (req, res) => {
  const { password, data } = req.body ?? {};

  if (!password || !data) {
    return res.status(400).json({ error: 'Missing password or data' });
  }

  try {
    // Read current data to get the stored admin password
    const current = await getSiteData();
    const adminPwd =
      current?.meta?.adminPassword ??
      process.env.ADMIN_PASSWORD ??
      'saba2026';

    if (password !== adminPwd) {
      return res.status(403).json({ error: 'Wrong password' });
    }

    await setSiteData(data);
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/data error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});
