import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { pool, getSiteData } from '../db.js';

export const uploadRouter = Router();

/* ── Cloudinary config (from env vars) ── */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ── Multer: store uploads in memory ── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60 MB max
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(jpeg|png|webp|gif|heic|heif|tiff?)/i.test(file.mimetype);
    cb(null, ok);
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/upload
   Multipart body:  image (file), password (string), workId? (string)

   Returns: { url, thumbUrl, publicId, width, height }

   Pipeline:
     1. Verify admin password
     2. Upload buffer → Cloudinary with auto-optimization
     3. Cloudinary returns the CDN URL
     4. Generate a 600px thumbnail URL (Cloudinary transform)
     5. Log to images table
───────────────────────────────────────────────────────── */
uploadRouter.post('/', upload.single('image'), async (req, res) => {
  /* 1 ── Auth */
  const { password, workId, name } = req.body ?? {};
  const displayName = (name ?? '').toString().trim();

  try {
    const current = await getSiteData();
    const adminPwd =
      current?.meta?.adminPassword ??
      process.env.ADMIN_PASSWORD ??
      'saba2026';

    if (password !== adminPwd) {
      return res.status(403).json({ error: 'Wrong password' });
    }
  } catch (dbErr) {
    console.error('Auth DB error:', dbErr);
    // If DB is unreachable, fall back to env var password
    if (password !== (process.env.ADMIN_PASSWORD ?? 'saba2026')) {
      return res.status(403).json({ error: 'Wrong password' });
    }
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No image file received' });
  }

  /* 2 ── Upload to Cloudinary with automatic optimization */
  try {
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'deliquente',
          resource_type: 'image',
          // Custom name from the admin: shown in Cloudinary library + stored as alt context
          ...(displayName ? {
            display_name: displayName,
            context: { alt: displayName, caption: displayName },
          } : {}),
          /*
           * Cloudinary eagerly applies these transformations on upload
           * so the CDN caches the optimized version immediately:
           *  - auto quality (saves 30–70% vs raw JPEG)
           *  - auto format (serves WebP/AVIF to modern browsers)
           *  - resize to max 2400px (no upscaling)
           */
          eager: [
            {
              quality: 'auto:good',
              fetch_format: 'auto',
              width: 2400,
              height: 2400,
              crop: 'limit',
            }
          ],
          eager_async: false,
          // Strip EXIF (privacy + size), auto-rotate based on EXIF orientation
          exif: false,
          image_metadata: false,
          angle: 'exif',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    /* 3 ── Thumbnail URL (600px wide, lazy-loaded in gallery) */
    const thumbUrl = cloudinary.url(uploadResult.public_id, {
      width: 600,
      crop: 'limit',
      quality: 'auto:low',
      fetch_format: 'auto',
      secure: true,
    });

    /* 4 ── Log to DB (non-blocking — don't fail upload if this fails) */
    pool.query(
      `INSERT INTO images (public_id, url, thumb_url, work_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (public_id) DO UPDATE
         SET url = EXCLUDED.url, thumb_url = EXCLUDED.thumb_url`,
      [uploadResult.public_id, uploadResult.secure_url, thumbUrl, workId ?? null]
    ).catch(err => console.error('Image DB log error:', err));

    /* 5 ── Respond */
    const optimizedUrl = uploadResult.eager?.[0]?.secure_url ?? uploadResult.secure_url;

    res.json({
      ok:       true,
      url:      optimizedUrl,
      thumbUrl,
      publicId: uploadResult.public_id,
      width:    uploadResult.width,
      height:   uploadResult.height,
    });

  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
});

/* ─────────────────────────────────────────────────
   GET /api/upload/list  — list all uploaded images
───────────────────────────────────────────────── */
uploadRouter.get('/list', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT public_id, url, thumb_url, work_id, created_at FROM images ORDER BY created_at DESC LIMIT 200'
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});
