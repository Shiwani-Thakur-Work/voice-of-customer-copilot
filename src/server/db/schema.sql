-- Voice of Customer Copilot — Database Schema

CREATE TABLE IF NOT EXISTS import_batch (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  row_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback_item (
  id TEXT PRIMARY KEY,
  source TEXT DEFAULT 'csv_import',
  raw_text TEXT NOT NULL,
  normalized_text TEXT,
  user_segment TEXT,
  sentiment TEXT,
  is_duplicate INTEGER DEFAULT 0,
  duplicate_of_id TEXT,
  metadata_json TEXT DEFAULT '{}',
  import_batch_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (import_batch_id) REFERENCES import_batch(id),
  FOREIGN KEY (duplicate_of_id) REFERENCES feedback_item(id)
);

CREATE TABLE IF NOT EXISTS theme (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  frequency_count INTEGER DEFAULT 0,
  severity TEXT DEFAULT 'medium' CHECK(severity IN ('low','medium','high','critical')),
  confidence REAL DEFAULT 0.0,
  status TEXT DEFAULT 'auto_generated' CHECK(status IN ('auto_generated','user_confirmed','user_rejected','merged')),
  merged_into_id TEXT,
  missing_evidence TEXT,
  follow_up_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (merged_into_id) REFERENCES theme(id)
);

CREATE TABLE IF NOT EXISTS theme_feedback (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL,
  feedback_id TEXT NOT NULL,
  confidence REAL DEFAULT 0.0,
  assigned_by TEXT DEFAULT 'ai' CHECK(assigned_by IN ('ai','user')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (theme_id) REFERENCES theme(id) ON DELETE CASCADE,
  FOREIGN KEY (feedback_id) REFERENCES feedback_item(id) ON DELETE CASCADE,
  UNIQUE(theme_id, feedback_id)
);

CREATE TABLE IF NOT EXISTS export_report (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content_json TEXT,
  selected_themes TEXT DEFAULT '[]',
  format TEXT DEFAULT 'markdown',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_action (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_batch ON feedback_item(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_feedback_duplicate ON feedback_item(duplicate_of_id);
CREATE INDEX IF NOT EXISTS idx_feedback_segment ON feedback_item(user_segment);
CREATE INDEX IF NOT EXISTS idx_theme_status ON theme(status);
CREATE INDEX IF NOT EXISTS idx_theme_feedback_theme ON theme_feedback(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_feedback_feedback ON theme_feedback(feedback_id);
CREATE INDEX IF NOT EXISTS idx_user_action_type ON user_action(action_type);
