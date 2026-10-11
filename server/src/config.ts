import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'smart-compiler-super-secret-key-change-in-prod-2026',
  DB_PATH: process.env.DB_PATH || path.resolve(process.cwd(), 'smart_compiler.db'),
  MAX_EXEC_TIME_MS: parseInt(process.env.MAX_EXEC_TIME_MS || '5000', 10),
  MAX_OUTPUT_BYTES: parseInt(process.env.MAX_OUTPUT_BYTES || '65536', 10), // 64 KB limit
  MAX_SOURCE_LENGTH: 100000, // 100 KB max source code
  AI: {
    PROVIDER: (process.env.AI_PROVIDER || 'heuristic').toLowerCase(), // 'groq' | 'openrouter' | 'gemini' | 'ollama' | 'openai' | 'heuristic'
    API_KEY: process.env.AI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || '',
    MODEL: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    ENDPOINT: process.env.AI_ENDPOINT || ''
  }
};
