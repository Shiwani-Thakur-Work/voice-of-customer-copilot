import { Router } from 'express';
import { getAll, getOne } from '../db/connection.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

// GET /api/dashboard/stats — Aggregated overview metrics
router.get('/stats', asyncHandler(async (req, res) => {
  const totalFeedback = getOne(`SELECT COUNT(*) as count FROM feedback_item`)?.count || 0;
  const duplicateFeedback = getOne(`SELECT COUNT(*) as count FROM feedback_item WHERE is_duplicate = 1`)?.count || 0;
  const uniqueFeedback = totalFeedback - duplicateFeedback;

  const totalThemes = getOne(`SELECT COUNT(*) as count FROM theme WHERE status != 'merged' AND status != 'user_rejected'`)?.count || 0;
  const confirmedThemes = getOne(`SELECT COUNT(*) as count FROM theme WHERE status = 'user_confirmed'`)?.count || 0;
  const pendingReviewThemes = getOne(`SELECT COUNT(*) as count FROM theme WHERE status = 'auto_generated'`)?.count || 0;
  const rejectedThemes = getOne(`SELECT COUNT(*) as count FROM theme WHERE status = 'user_rejected'`)?.count || 0;

  // Breakdown of themes by severity
  const severityBreakdown = getAll(`
    SELECT severity, COUNT(*) as count
    FROM theme
    WHERE status != 'merged' AND status != 'user_rejected'
    GROUP BY severity
  `);

  // Top themes by frequency
  const topThemes = getAll(`
    SELECT id, name, frequency_count, severity, confidence, status
    FROM theme
    WHERE status != 'merged' AND status != 'user_rejected'
    ORDER BY frequency_count DESC
    LIMIT 6
  `);

  // Segments breakdown
  const segments = getAll(`
    SELECT user_segment, COUNT(*) as count
    FROM feedback_item
    WHERE user_segment IS NOT NULL AND user_segment != ''
    GROUP BY user_segment
    ORDER BY count DESC
    LIMIT 5
  `);

  // Recent user audit actions
  const recentActions = getAll(`
    SELECT * FROM user_action
    ORDER BY created_at DESC
    LIMIT 10
  `);

  res.json({
    feedback: {
      total: totalFeedback,
      unique: uniqueFeedback,
      duplicates: duplicateFeedback,
    },
    themes: {
      total: totalThemes,
      confirmed: confirmedThemes,
      pending: pendingReviewThemes,
      rejected: rejectedThemes,
    },
    severityBreakdown: severityBreakdown.reduce((acc, curr) => {
      acc[curr.severity] = curr.count;
      return acc;
    }, {}),
    topThemes,
    segments,
    recentActions: recentActions.map(a => ({
      ...a,
      details: a.details_json ? JSON.parse(a.details_json) : null,
    })),
  });
}));

export default router;
