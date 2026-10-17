import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  dbPath: process.env.DB_PATH || './data/voc.db',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  uploadsDir: path.resolve(__dirname, '../../uploads'),
  isDemoMode: !process.env.GEMINI_API_KEY,
  similarity: {
    duplicateThreshold: 0.92,
  },
  prioritization: {
    weights: {
      frequency: 0.25,
      severity: 0.35,
      userImpact: 0.25,
      confidence: 0.15,
    },
  },
};

export default config;
