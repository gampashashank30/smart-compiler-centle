import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config.js';

const dbDir = path.dirname(CONFIG.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const sqlite = new sqlite3.Database(CONFIG.DB_PATH, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
  } else {
    console.log(`[Database] Connected to SQLite database at ${CONFIG.DB_PATH}`);
  }
});

// Promisified helpers
export function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    sqlite.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    sqlite.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row as T);
    });
  });
}

export function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    sqlite.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve((rows || []) as T[]);
    });
  });
}

export function dbExec(sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    sqlite.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export async function initDatabase(): Promise<void> {
  // Enable WAL mode and foreign keys for high reliability and performance
  await dbExec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      display_name TEXT NOT NULL,
      is_guest INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      preferences TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      language TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      content TEXT NOT NULL,
      language TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS compilation_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      language TEXT NOT NULL,
      code TEXT NOT NULL,
      stdin TEXT DEFAULT '',
      status TEXT NOT NULL, -- queued, running, completed, failed, timed_out, cancelled
      exit_code INTEGER,
      stdout TEXT DEFAULT '',
      stderr TEXT DEFAULT '',
      compile_time_ms INTEGER DEFAULT 0,
      exec_time_ms INTEGER DEFAULT 0,
      diagnostics TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ai_analyses (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      language TEXT NOT NULL,
      error_category TEXT NOT NULL,
      error_summary TEXT NOT NULL,
      root_cause TEXT NOT NULL,
      line_number INTEGER,
      column_number INTEGER,
      why_occurred TEXT NOT NULL,
      beginner_explanation TEXT NOT NULL,
      proposed_fix TEXT NOT NULL,
      patch_diff TEXT DEFAULT '',
      confidence REAL DEFAULT 0.9,
      prevention_tip TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auto_fix_proposals (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      original_code TEXT NOT NULL,
      proposed_code TEXT NOT NULL,
      patch_diff TEXT NOT NULL,
      verification_status TEXT NOT NULL, -- pending, verified_success, verified_failed, rejected
      verification_job_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      language TEXT NOT NULL,
      level TEXT NOT NULL, -- beginner, intermediate, advanced
      current_stage INTEGER DEFAULT 1,
      stage_data TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_quizzes (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL, -- JSON array of strings
      correct_index INTEGER NOT NULL,
      explanation TEXT NOT NULL,
      user_answer INTEGER,
      is_correct INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS translations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      source_lang TEXT NOT NULL,
      target_lang TEXT NOT NULL,
      source_code TEXT NOT NULL,
      translated_code TEXT NOT NULL,
      differences_explanation TEXT NOT NULL,
      validation_status TEXT NOT NULL, -- valid, invalid, untestable
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS code_improvements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      language TEXT NOT NULL,
      action_type TEXT NOT NULL, -- refactor, complexity, readability, tests, edge_cases
      original_code TEXT NOT NULL,
      improved_code TEXT NOT NULL,
      analysis_notes TEXT NOT NULL,
      patch_diff TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_mistakes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      language TEXT NOT NULL,
      error_category TEXT NOT NULL,
      occurrence_count INTEGER DEFAULT 1,
      last_occurred_at TEXT NOT NULL,
      example_code TEXT DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_user ON compilation_jobs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_mistakes_user ON recurring_mistakes(user_id, occurrence_count DESC);
    CREATE INDEX IF NOT EXISTS idx_analyses_job ON ai_analyses(job_id);
    CREATE INDEX IF NOT EXISTS idx_study_user ON study_sessions(user_id);
  `);
  console.log('[Database] Schema initialized successfully with WAL mode and indexes.');
}
