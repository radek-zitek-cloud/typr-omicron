import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'typr.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create user_settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      font TEXT NOT NULL DEFAULT 'Courier New',
      font_size TEXT NOT NULL DEFAULT 'M',
      theme TEXT NOT NULL DEFAULT 'dark',
      sound_enabled INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  // Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      mode_value INTEGER NOT NULL,
      text TEXT NOT NULL,
      user_input TEXT NOT NULL,
      events TEXT NOT NULL,
      session_duration INTEGER NOT NULL,
      accuracy REAL NOT NULL,
      max_index_reached INTEGER,
      mechanical_cpm REAL,
      productive_cpm REAL,
      char_states TEXT,
      timestamp TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON sessions(timestamp);
  `);

  // Create default guest user if not exists
  const insertGuest = db.prepare(`
    INSERT OR IGNORE INTO users (user_id, username)
    VALUES ('guest', 'Guest')
  `);
  insertGuest.run();

  // Create default settings for guest user
  const insertGuestSettings = db.prepare(`
    INSERT OR IGNORE INTO user_settings (user_id)
    VALUES ('guest')
  `);
  insertGuestSettings.run();

  console.log('Database initialized successfully');
}

// Initialize the database on module load
initializeDatabase();

export default db;
