import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './connection.js';
import { parseCSV } from '../services/csv-parser.js';
import { normalizeBatch } from '../services/normalizer.js';
import { findDuplicates } from '../services/deduplicator.js';
import { extractThemes } from '../services/theme-extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  console.log('🌱 Starting database seeding...');
  const samplePath = path.resolve(__dirname, '../../../data/sample/sample-feedback.csv');
  const db = getDb();

  // Reset existing data
  console.log('🧹 Clearing previous seed data...');
  db.prepare(`DELETE FROM theme_feedback`).run();
  db.prepare(`DELETE FROM theme`).run();
  db.prepare(`DELETE FROM feedback_item`).run();
  db.prepare(`DELETE FROM import_batch`).run();
  db.prepare(`DELETE FROM export_report`).run();
  db.prepare(`DELETE FROM user_action`).run();

  const batchId = uuidv4();
  console.log(`📂 Parsing sample CSV: ${samplePath}`);
  const parsed = await parseCSV(samplePath);
  console.log(`✅ Parsed ${parsed.items.length} feedback items.`);

  const normalized = normalizeBatch(parsed.items);
  console.log(`✅ Normalized items.`);

  // Insert batch
  db.prepare(`
    INSERT INTO import_batch (id, filename, row_count, processed_count, status)
    VALUES (?, ?, ?, ?, 'completed')
  `).run(batchId, 'sample-feedback.csv', parsed.totalRows, normalized.length);

  // Insert feedback items
  const insertStmt = db.prepare(`
    INSERT INTO feedback_item (id, source, raw_text, normalized_text, user_segment, metadata_json, import_batch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertedItems = [];
  const insertMany = db.transaction((items) => {
    for (const item of items) {
      const id = uuidv4();
      insertStmt.run(id, item.source, item.raw_text, item.normalized_text, item.user_segment, item.metadata_json, batchId);
      insertedItems.push({ ...item, id });
    }
  });

  insertMany(normalized);
  console.log(`💾 Saved ${insertedItems.length} items to database.`);

  // Find duplicates
  console.log('🔍 Identifying duplicates...');
  const { items: deduped, duplicateCount } = await findDuplicates(insertedItems);
  const updateDup = db.prepare(`UPDATE feedback_item SET is_duplicate = ?, duplicate_of_id = ? WHERE id = ?`);
  const updateDups = db.transaction((items) => {
    for (const item of items) {
      if (item.is_duplicate) {
        updateDup.run(1, item.duplicate_of_id, item.id);
      }
    }
  });
  updateDups(deduped);
  db.prepare(`UPDATE import_batch SET duplicate_count = ? WHERE id = ?`).run(duplicateCount, batchId);
  console.log(`✨ Found & marked ${duplicateCount} duplicate items.`);

  // Extract themes
  console.log('🧠 Extracting themes...');
  const themes = await extractThemes(deduped);
  console.log(`🎯 Generated ${themes.length} initial themes.`);

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

      for (const feedbackId of (theme.feedbackIds || [])) {
        insertLink.run(uuidv4(), theme.id, feedbackId, theme.confidence);
      }
    }
  });

  insertThemes(themes);

  console.log('🎉 Seeding successfully completed!\n');
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
