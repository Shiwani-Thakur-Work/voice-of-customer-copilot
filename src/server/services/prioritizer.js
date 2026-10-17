/**
 * Prioritization Service
 * Scores and ranks themes based on configurable weighted criteria.
 */
import config from '../config.js';

const SEVERITY_SCORES = {
  low: 0.25,
  medium: 0.5,
  high: 0.75,
  critical: 1.0,
};

/**
 * Calculate priority score for a theme
 */
export function calculateScore(theme, maxFrequency, weights = null) {
  const w = weights || config.prioritization.weights;

  // Normalize frequency to 0-1 range
  const frequencyNorm = maxFrequency > 0 ? theme.frequency_count / maxFrequency : 0;

  // Severity score
  const severityScore = SEVERITY_SCORES[theme.severity] || 0.5;

  // User impact — approximate from segment diversity (if available)
  const userImpactScore = frequencyNorm * 0.7 + severityScore * 0.3;

  // Confidence
  const confidenceScore = theme.confidence || 0.5;

  // Weighted sum
  const score = (
    w.frequency * frequencyNorm +
    w.severity * severityScore +
    w.userImpact * userImpactScore +
    w.confidence * confidenceScore
  );

  return Math.round(score * 100) / 100;
}

/**
 * Prioritize a list of themes
 */
export function prioritizeThemes(themes, customWeights = null) {
  if (!themes || themes.length === 0) return [];

  const maxFrequency = Math.max(...themes.map(t => t.frequency_count || 0), 1);

  return themes
    .filter(t => t.status !== 'user_rejected' && t.status !== 'merged')
    .map(theme => ({
      ...theme,
      priority_score: calculateScore(theme, maxFrequency, customWeights),
    }))
    .sort((a, b) => b.priority_score - a.priority_score);
}
