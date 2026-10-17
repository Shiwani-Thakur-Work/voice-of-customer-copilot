import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from './config.js';
import { getDb } from './db/connection.js';
import importRoutes from './routes/import.js';
import feedbackRoutes from './routes/feedback.js';
import themesRoutes from './routes/themes.js';
import analyzeRoutes from './routes/analyze.js';
import prioritizeRoutes from './routes/prioritize.js';
import exportRoutes from './routes/export.js';
import dashboardRoutes from './routes/dashboard.js';
import { errorHandler } from './middleware/error-handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Ensure directories exist
const dirs = [config.uploadsDir, path.resolve(__dirname, '../../data')];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize database
getDb();

// API Routes
app.use('/api/import', importRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/themes', themesRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/prioritize', prioritizeRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve static frontend files from src/client
const clientDir = path.resolve(__dirname, '../client');
app.use(express.static(clientDir));

// Fallback to index.html for SPA client-side routing (excluding /api)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDir, 'index.html'));
});

// Error handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`\n  🚀 VoC Copilot running on http://localhost:${config.port}`);
  console.log(`  📊 Mode: ${config.isDemoMode ? 'DEMO (no Gemini API key)' : 'LIVE (Gemini API connected)'}\n`);
});

export default app;
