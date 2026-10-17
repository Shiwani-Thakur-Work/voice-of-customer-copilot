/**
 * Gemini AI Client
 * Handles communication with Google Gemini API for theme extraction and analysis.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config.js';
import { THEME_EXTRACTION_PROMPT, THEME_ENRICHMENT_PROMPT } from './prompts.js';

let genAI = null;

function getClient() {
  if (!genAI && config.geminiApiKey) {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

/**
 * Generate themes from feedback items using Gemini
 */
export async function generateThemes(feedbackItems) {
  const client = getClient();
  if (!client) throw new Error('Gemini API key not configured');

  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const feedbackText = feedbackItems
    .map((item, i) => `[${i + 1}] ${item.normalized_text || item.raw_text}`)
    .join('\n');

  const prompt = THEME_EXTRACTION_PROMPT.replace('{{FEEDBACK}}', feedbackText);

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Parse JSON from the response
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response as JSON');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  const themes = JSON.parse(jsonStr);

  return themes.map(theme => ({
    name: theme.name,
    description: theme.description,
    severity: theme.severity || 'medium',
    confidence: theme.confidence || 0.7,
    missing_evidence: theme.missing_evidence || '',
    follow_up_notes: theme.follow_up_notes || '',
    feedbackIds: theme.feedback_indices
      ? theme.feedback_indices.map(i => feedbackItems[i - 1]?.id).filter(Boolean)
      : [],
    frequency_count: theme.feedback_indices?.length || 0,
  }));
}

/**
 * Enrich a theme with additional context using Gemini
 */
export async function enrichTheme(theme, feedbackTexts) {
  const client = getClient();
  if (!client) throw new Error('Gemini API key not configured');

  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = THEME_ENRICHMENT_PROMPT
    .replace('{{THEME_NAME}}', theme.name)
    .replace('{{THEME_DESCRIPTION}}', theme.description || '')
    .replace('{{FEEDBACK}}', feedbackTexts.join('\n'));

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return theme;

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  const enriched = JSON.parse(jsonStr);

  return {
    ...theme,
    description: enriched.description || theme.description,
    severity: enriched.severity || theme.severity,
    missing_evidence: enriched.missing_evidence || theme.missing_evidence,
    follow_up_notes: enriched.follow_up_notes || theme.follow_up_notes,
  };
}
