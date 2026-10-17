import { Router } from 'express';
import { getAll, getOne } from '../db/connection.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

// GET /api/feedback — List feedback items (paginated, filterable)
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, segment, source, theme_id, show_duplicates } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClause = [];
  let params = [];

  if (search) {
    whereClause.push(`(f.normalized_text LIKE ? OR f.raw_text LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`);
  }
  if (segment) {
    whereClause.push(`f.user_segment = ?`);
    params.push(segment);
  }
  if (source) {
    whereClause.push(`f.source = ?`);
    params.push(source);
  }
  if (!show_duplicates || show_duplicates === 'false') {
    whereClause.push(`f.is_duplicate = 0`);
  }
  if (theme_id) {
    whereClause.push(`EXISTS (SELECT 1 FROM theme_feedback tf WHERE tf.feedback_id = f.id AND tf.theme_id = ?)`);
    params.push(theme_id);
  }

  const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

  const total = getOne(`SELECT COUNT(*) as count FROM feedback_item f ${where}`, params);
  const items = getAll(
    `SELECT f.*, GROUP_CONCAT(DISTINCT t.name) as theme_names
     FROM feedback_item f
     LEFT JOIN theme_feedback tf ON tf.feedback_id = f.id
     LEFT JOIN theme t ON t.id = tf.theme_id AND t.status != 'user_rejected'
     ${where}
     GROUP BY f.id
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  // Get unique segments for filtering
  const segments = getAll(`SELECT DISTINCT user_segment FROM feedback_item WHERE user_segment IS NOT NULL ORDER BY user_segment`);

  res.json({
    items: items.map(item => ({
      ...item,
      theme_names: item.theme_names ? item.theme_names.split(',') : [],
    })),
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total.count / parseInt(limit)),
    segments: segments.map(s => s.user_segment),
  });
}));

// GET /api/feedback/:id — Get a single feedback item with linked themes
router.get('/:id', asyncHandler(async (req, res) => {
  const item = getOne(`SELECT * FROM feedback_item WHERE id = ?`, [req.params.id]);
  if (!item) return res.status(404).json({ error: true, message: 'Feedback item not found' });

  const themes = getAll(
    `SELECT t.*, tf.confidence as link_confidence, tf.assigned_by
     FROM theme t
     JOIN theme_feedback tf ON tf.theme_id = t.id
     WHERE tf.feedback_id = ?
     ORDER BY tf.confidence DESC`,
    [req.params.id]
  );

  res.json({ ...item, themes });
}));

export default router;
