import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';
import { parseCSV } from '../services/csv-parser.js';
import { normalizeBatch } from '../services/normalizer.js';
import { getDb, runQuery, getAll } from '../db/connection.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

// Configure multer
const storage = multer.diskStorage({
  destination: config.uploadsDir,
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4().slice(0, 8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// POST /api/import/csv — Upload and process a CSV file
router.post('/csv', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: true, message: 'No file uploaded' });
  }

  const batchId = uuidv4();

  // Parse CSV
  const parsed = await parseCSV(req.file.path);

  // Normalize
  const normalized = normalizeBatch(parsed.items);

  // Create import batch
  const db = getDb();
  db.prepare(`INSERT INTO import_batch (id, filename, row_count, status) VALUES (?, ?, ?, 'processing')`)
    .run(batchId, req.file.originalname, parsed.totalRows);

  // Insert feedback items
  const insertStmt = db.prepare(`
    INSERT INTO feedback_item (id, source, raw_text, normalized_text, user_segment, metadata_json, import_batch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insertStmt.run(
        uuidv4(),
        item.source,
        item.raw_text,
        item.normalized_text,
        item.user_segment,
        item.metadata_json,
        batchId
      );
    }
  });

  insertMany(normalized);

  // Update batch status
  db.prepare(`UPDATE import_batch SET processed_count = ?, status = 'completed' WHERE id = ?`)
    .run(normalized.length, batchId);

  res.json({
    success: true,
    batchId,
    filename: req.file.originalname,
    totalRows: parsed.totalRows,
    importedCount: normalized.length,
    columnMapping: parsed.columnMapping,
    preview: parsed.preview,
  });
}));

// GET /api/import/batches — List all import batches
router.get('/batches', asyncHandler(async (req, res) => {
  const batches = getAll('SELECT * FROM import_batch ORDER BY created_at DESC');
  res.json({ batches });
}));

export default router;
