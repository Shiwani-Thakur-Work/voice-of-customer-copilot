import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, getAll, getOne, runQuery } from '../db/connection.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

// GET /api/themes — List all themes with counts
router.get('/', asyncHandler(async (req, res) => {
  const { status, severity, min_confidence } = req.query;

  let whereClause = [];
  let params = [];

  if (status) {
    whereClause.push(`t.status = ?`);
    params.push(status);
  }
  if (severity) {
    whereClause.push(`t.severity = ?`);
    params.push(severity);
  }
  if (min_confidence) {
    whereClause.push(`t.confidence >= ?`);
    params.push(parseFloat(min_confidence));
  }

  // Exclude merged themes by default
  whereClause.push(`t.status != 'merged'`);

  const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

  const themes = getAll(
    `SELECT t.*,
       COUNT(DISTINCT tf.feedback_id) as linked_feedback_count,
       GROUP_CONCAT(DISTINCT fi.user_segment) as segments
     FROM theme t
     LEFT JOIN theme_feedback tf ON tf.theme_id = t.id
     LEFT JOIN feedback_item fi ON fi.id = tf.feedback_id
     ${where}
     GROUP BY t.id
     ORDER BY t.frequency_count DESC`,
    params
  );

  res.json({
    themes: themes.map(t => ({
      ...t,
      segments: t.segments ? [...new Set(t.segments.split(',').filter(Boolean))] : [],
    })),
  });
}));

// GET /api/themes/:id — Get theme detail with all linked feedback
router.get('/:id', asyncHandler(async (req, res) => {
  const theme = getOne(`SELECT * FROM theme WHERE id = ?`, [req.params.id]);
  if (!theme) return res.status(404).json({ error: true, message: 'Theme not found' });

  const feedback = getAll(
    `SELECT fi.*, tf.confidence as link_confidence, tf.assigned_by
     FROM feedback_item fi
     JOIN theme_feedback tf ON tf.feedback_id = fi.id
     WHERE tf.theme_id = ?
     ORDER BY tf.confidence DESC`,
    [req.params.id]
  );

  res.json({ ...theme, feedback });
}));

// PATCH /api/themes/:id — Edit theme
router.patch('/:id', asyncHandler(async (req, res) => {
  const { name, description, severity } = req.body;
  const theme = getOne(`SELECT * FROM theme WHERE id = ?`, [req.params.id]);
  if (!theme) return res.status(404).json({ error: true, message: 'Theme not found' });

  const db = getDb();
  db.prepare(`UPDATE theme SET name = COALESCE(?, name), description = COALESCE(?, description), severity = COALESCE(?, severity), updated_at = datetime('now') WHERE id = ?`)
    .run(name || null, description || null, severity || null, req.params.id);

  // Log user action
  db.prepare(`INSERT INTO user_action (id, action_type, target_type, target_id, details_json) VALUES (?, 'theme_edit', 'theme', ?, ?)`)
    .run(uuidv4(), req.params.id, JSON.stringify({ name, description, severity }));

  const updated = getOne(`SELECT * FROM theme WHERE id = ?`, [req.params.id]);
  res.json(updated);
}));

// POST /api/themes/:id/confirm — Confirm an auto-generated theme
router.post('/:id/confirm', asyncHandler(async (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE theme SET status = 'user_confirmed', updated_at = datetime('now') WHERE id = ?`)
    .run(req.params.id);

  db.prepare(`INSERT INTO user_action (id, action_type, target_type, target_id) VALUES (?, 'theme_confirm', 'theme', ?)`)
    .run(uuidv4(), req.params.id);

  const updated = getOne(`SELECT * FROM theme WHERE id = ?`, [req.params.id]);
  res.json(updated);
}));

// POST /api/themes/:id/reject — Reject a theme
router.post('/:id/reject', asyncHandler(async (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE theme SET status = 'user_rejected', updated_at = datetime('now') WHERE id = ?`)
    .run(req.params.id);

  db.prepare(`INSERT INTO user_action (id, action_type, target_type, target_id) VALUES (?, 'theme_reject', 'theme', ?)`)
    .run(uuidv4(), req.params.id);

  const updated = getOne(`SELECT * FROM theme WHERE id = ?`, [req.params.id]);
  res.json(updated);
}));

// POST /api/themes/:id/merge — Merge this theme into another
router.post('/:id/merge', asyncHandler(async (req, res) => {
  const { target_theme_id } = req.body;
  if (!target_theme_id) return res.status(400).json({ error: true, message: 'target_theme_id is required' });

  const sourceTheme = getOne(`SELECT * FROM theme WHERE id = ?`, [req.params.id]);
  const targetTheme = getOne(`SELECT * FROM theme WHERE id = ?`, [target_theme_id]);
  if (!sourceTheme || !targetTheme) return res.status(404).json({ error: true, message: 'Theme not found' });

  const db = getDb();

  // Move feedback links to target theme
  const sourceLinks = getAll(`SELECT * FROM theme_feedback WHERE theme_id = ?`, [req.params.id]);
  for (const link of sourceLinks) {
    const existing = getOne(`SELECT * FROM theme_feedback WHERE theme_id = ? AND feedback_id = ?`, [target_theme_id, link.feedback_id]);
    if (!existing) {
      db.prepare(`INSERT INTO theme_feedback (id, theme_id, feedback_id, confidence, assigned_by) VALUES (?, ?, ?, ?, 'user')`)
        .run(uuidv4(), target_theme_id, link.feedback_id, link.confidence);
    }
  }

  // Update frequency count
  const newCount = getOne(`SELECT COUNT(*) as count FROM theme_feedback WHERE theme_id = ?`, [target_theme_id]);
  db.prepare(`UPDATE theme SET frequency_count = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(newCount.count, target_theme_id);

  // Mark source as merged
  db.prepare(`UPDATE theme SET status = 'merged', merged_into_id = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(target_theme_id, req.params.id);

  // Log action
  db.prepare(`INSERT INTO user_action (id, action_type, target_type, target_id, details_json) VALUES (?, 'theme_merge', 'theme', ?, ?)`)
    .run(uuidv4(), req.params.id, JSON.stringify({ merged_into: target_theme_id }));

  const updated = getOne(`SELECT * FROM theme WHERE id = ?`, [target_theme_id]);
  res.json(updated);
}));

export default router;
