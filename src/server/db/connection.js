import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db = null;

export function getDb() {
  if (db) return db;

  const dbPath = process.env.DB_PATH || './data/voc.db';
  const dbDir = path.dirname(dbPath);

  // Ensure data directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);

  return db;
}

// Helper functions
export function runQuery(sql, params = []) {
  const stmt = getDb().prepare(sql);
  return stmt.run(...params);
}

export function getAll(sql, params = []) {
  const stmt = getDb().prepare(sql);
  return stmt.all(...params);
}

export function getOne(sql, params = []) {
  const stmt = getDb().prepare(sql);
  return stmt.get(...params);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
