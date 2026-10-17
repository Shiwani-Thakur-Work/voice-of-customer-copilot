import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, getAll, getOne } from '../db/connection.js';
import { generateMarkdownReport, generateJSONReport } from '../services/exporter.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

// POST /api/export — Generate a product discovery summary
router.post('/', asyncHandler(async (req, res) => {
  const { theme_ids = [], format = 'markdown', title = 'Product Discovery Summary' } = req.body;

  let themesQuery = `SELECT * FROM theme WHERE status != 'user_rejected' AND status != 'merged'`;
  let params = [];

  if (theme_ids.length > 0) {
    const placeholders = theme_ids.map(() => '?').join(',');
    themesQuery += ` AND id IN (${placeholders})`;
    params = theme_ids;
  }

  themesQuery += ` ORDER BY frequency_count DESC`;

  const themes = getAll(themesQuery, params);

  if (themes.length === 0) {
    return res.status(400).json({ error: true, message: 'No themes selected or available to export' });
  }

  // Fetch supporting feedback for each theme
  const feedbackMap = {};
  for (const theme of themes) {
    feedbackMap[theme.id] = getAll(`
      SELECT fi.raw_text, fi.user_segment, fi.source
      FROM feedback_item fi
      JOIN theme_feedback tf ON tf.feedback_id = fi.id
      WHERE tf.theme_id = ?
      ORDER BY tf.confidence DESC
    `, [theme.id]);
  }

  // General metadata
  const totalFeedbackCount = getOne(`SELECT COUNT(*) as count FROM feedback_item`);
  const uniqueFeedbackCount = getOne(`SELECT COUNT(*) as count FROM feedback_item WHERE is_duplicate = 0`);

  const metadata = {
    totalFeedback: totalFeedbackCount?.count || 0,
    uniqueFeedback: uniqueFeedbackCount?.count || 0,
    dateRange: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  };

  let content = '';
  if (format === 'json') {
    content = JSON.stringify(generateJSONReport(themes, feedbackMap, metadata), null, 2);
  } else {
    content = generateMarkdownReport(themes, feedbackMap, metadata);
  }

  const exportId = uuidv4();
  const db = getDb();
  db.prepare(`
    INSERT INTO export_report (id, title, content_json, selected_themes, format)
    VALUES (?, ?, ?, ?, ?)
  `).run(exportId, title, content, JSON.stringify(themes.map(t => t.id)), format);

  res.json({
    id: exportId,
    title,
    format,
    content,
    themeCount: themes.length,
    createdAt: new Date().toISOString()
  });
}));

// GET /api/export/:id — Download/view an exported report
router.get('/:id', asyncHandler(async (req, res) => {
  const report = getOne(`SELECT * FROM export_report WHERE id = ?`, [req.params.id]);
  if (!report) {
    return res.status(404).json({ error: true, message: 'Export report not found' });
  }

  res.json(report);
}));

export default router;
