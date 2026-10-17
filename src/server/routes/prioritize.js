import { Router } from 'express';
import { getAll } from '../db/connection.js';
import { prioritizeThemes } from '../services/prioritizer.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

// GET /api/prioritize — Get prioritized themes with custom or default weights
router.get('/', asyncHandler(async (req, res) => {
  const { w_freq, w_sev, w_impact, w_conf, segment } = req.query;

  let customWeights = null;
  if (w_freq !== undefined || w_sev !== undefined || w_impact !== undefined || w_conf !== undefined) {
    customWeights = {
      frequency: parseFloat(w_freq || 0.25),
      severity: parseFloat(w_sev || 0.35),
      userImpact: parseFloat(w_impact || 0.25),
      confidence: parseFloat(w_conf || 0.15),
    };
  }

  // Get active themes
  let query = `
    SELECT t.*,
           COUNT(DISTINCT tf.feedback_id) as linked_feedback_count,
           GROUP_CONCAT(DISTINCT fi.user_segment) as segments
    FROM theme t
    LEFT JOIN theme_feedback tf ON tf.theme_id = t.id
    LEFT JOIN feedback_item fi ON fi.id = tf.feedback_id
    WHERE t.status != 'user_rejected' AND t.status != 'merged'
  `;
  const params = [];

  if (segment) {
    query += ` AND EXISTS (
      SELECT 1 FROM theme_feedback tf2
      JOIN feedback_item fi2 ON fi2.id = tf2.feedback_id
      WHERE tf2.theme_id = t.id AND fi2.user_segment = ?
    )`;
    params.push(segment);
  }

  query += ` GROUP BY t.id`;

  const themes = getAll(query, params).map(t => ({
    ...t,
    segments: t.segments ? [...new Set(t.segments.split(',').filter(Boolean))] : [],
  }));

  const prioritized = prioritizeThemes(themes, customWeights);

  res.json({
    themes: prioritized,
    weights: customWeights || {
      frequency: 0.25,
      severity: 0.35,
      userImpact: 0.25,
      confidence: 0.15,
    },
  });
}));

export default router;
