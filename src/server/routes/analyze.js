import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, getAll, getOne } from '../db/connection.js';
import { findDuplicates } from '../services/deduplicator.js';
import { extractThemes } from '../services/theme-extractor.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

let analysisStatus = { status: 'idle', progress: 0, message: '' };

// POST /api/analyze — Trigger AI analysis on imported feedback
router.post('/', asyncHandler(async (req, res) => {
  const { batch_id } = req.body;

  // Get feedback items
  let whereClause = '';
  let params = [];

  if (batch_id) {
    whereClause = 'WHERE import_batch_id = ?';
    params = [batch_id];
  }

  const feedbackItems = getAll(`SELECT * FROM feedback_item ${whereClause} ORDER BY created_at`, params);

  if (feedbackItems.length === 0) {
    return res.status(400).json({ error: true, message: 'No feedback items to analyze' });
  }

  analysisStatus = { status: 'processing', progress: 10, message: 'Starting analysis...' };

  // Run analysis asynchronously
  runAnalysis(feedbackItems).catch(err => {
    console.error('Analysis failed:', err);
    analysisStatus = { status: 'failed', progress: 0, message: err.message };
  });

  res.json({ success: true, message: 'Analysis started', itemCount: feedbackItems.length });
}));

// GET /api/analyze/status — Check analysis progress
router.get('/status', (req, res) => {
  res.json(analysisStatus);
});

async function runAnalysis(feedbackItems) {
  const db = getDb();

  try {
    // Stage 1: Deduplication
    analysisStatus = { status: 'processing', progress: 30, message: 'Finding duplicates...' };
    const { items: deduped, duplicateCount } = await findDuplicates(feedbackItems);

    // Update duplicate flags in DB
    const updateDup = db.prepare(`UPDATE feedback_item SET is_duplicate = ?, duplicate_of_id = ? WHERE id = ?`);
    const updateDups = db.transaction((items) => {
      for (const item of items) {
        if (item.is_duplicate) {
          updateDup.run(1, item.duplicate_of_id, item.id);
        }
      }
    });
    updateDups(deduped);

    // Update batch duplicate count
    if (feedbackItems[0]?.import_batch_id) {
      db.prepare(`UPDATE import_batch SET duplicate_count = ? WHERE id = ?`)
        .run(duplicateCount, feedbackItems[0].import_batch_id);
    }

    // Stage 2: Theme Extraction
    analysisStatus = { status: 'processing', progress: 60, message: 'Extracting themes...' };
    const themes = await extractThemes(deduped);

    // Clear existing themes for re-analysis (idempotent)
    db.prepare(`DELETE FROM theme_feedback WHERE theme_id IN (SELECT id FROM theme WHERE status = 'auto_generated')`).run();
    db.prepare(`DELETE FROM theme WHERE status = 'auto_generated'`).run();

    // Store themes
    const insertTheme = db.prepare(`
      INSERT INTO theme (id, name, description, frequency_count, severity, confidence, status, missing_evidence, follow_up_notes)
      VALUES (?, ?, ?, ?, ?, ?, 'auto_generated', ?, ?)
    `);

    const insertLink = db.prepare(`
      INSERT OR IGNORE INTO theme_feedback (id, theme_id, feedback_id, confidence, assigned_by)
      VALUES (?, ?, ?, ?, 'ai')
    `);

    const insertThemes = db.transaction((themeList) => {
      for (const theme of themeList) {
        insertTheme.run(
          theme.id,
          theme.name,
          theme.description,
          theme.frequency_count,
          theme.severity,
          theme.confidence,
          theme.missing_evidence || null,
          theme.follow_up_notes || null
        );

        // Link feedback to theme
        for (const feedbackId of (theme.feedbackIds || [])) {
          insertLink.run(uuidv4(), theme.id, feedbackId, theme.confidence);
        }
      }
    });

    insertThemes(themes);

    analysisStatus = {
      status: 'completed',
      progress: 100,
      message: `Analysis complete. Found ${themes.length} themes, ${duplicateCount} duplicates.`,
      result: { themeCount: themes.length, duplicateCount },
    };
  } catch (err) {
    analysisStatus = { status: 'failed', progress: 0, message: err.message };
    throw err;
  }
}

export default router;
