/**
 * Theme Extractor Service
 * Uses Gemini AI to extract themes from feedback clusters.
 * Falls back to keyword-based extraction in demo mode.
 */
import { generateThemes } from '../ai/client.js';
import config from '../config.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Keyword-based theme extraction (demo mode fallback)
 */
const DEMO_THEME_KEYWORDS = {
  'Performance Issues': ['slow', 'lag', 'loading', 'speed', 'performance', 'crash', 'freeze', 'timeout', 'hang', 'unresponsive'],
  'User Interface / UX': ['confusing', 'intuitive', 'design', 'layout', 'ui', 'ux', 'interface', 'navigation', 'button', 'menu', 'hard to find', 'cluttered'],
  'Pricing Concerns': ['price', 'pricing', 'expensive', 'cost', 'subscription', 'plan', 'afford', 'value', 'money', 'charge', 'billing', 'free'],
  'Onboarding Experience': ['onboarding', 'setup', 'getting started', 'first time', 'tutorial', 'documentation', 'guide', 'learn', 'confus'],
  'Mobile Experience': ['mobile', 'phone', 'app', 'ios', 'android', 'tablet', 'responsive', 'touch', 'screen size'],
  'Customer Support': ['support', 'help', 'response time', 'ticket', 'agent', 'chat', 'resolve', 'assistance', 'contact'],
  'Feature Requests': ['feature', 'wish', 'would be nice', 'missing', 'add', 'integrate', 'integration', 'api', 'export', 'import'],
  'Reliability & Bugs': ['bug', 'error', 'broken', 'issue', 'problem', 'fix', 'not working', 'fail', 'glitch', 'wrong'],
  'Data & Security': ['data', 'security', 'privacy', 'encrypt', 'backup', 'loss', 'gdpr', 'compliance', 'permission'],
  'Positive Feedback': ['love', 'great', 'amazing', 'excellent', 'best', 'fantastic', 'awesome', 'wonderful', 'perfect', 'impressed'],
};

function extractThemesDemo(feedbackItems) {
  const themeMap = {};

  for (const item of feedbackItems) {
    if (item.is_duplicate) continue;
    const text = (item.normalized_text || item.raw_text).toLowerCase();

    for (const [themeName, keywords] of Object.entries(DEMO_THEME_KEYWORDS)) {
      const matchedKeywords = keywords.filter(kw => text.includes(kw));
      if (matchedKeywords.length > 0) {
        if (!themeMap[themeName]) {
          themeMap[themeName] = {
            id: uuidv4(),
            name: themeName,
            description: `Feedback related to ${themeName.toLowerCase()}`,
            feedbackIds: [],
            confidences: [],
            severity: 'medium',
          };
        }
        const confidence = Math.min(0.5 + matchedKeywords.length * 0.15, 0.95);
        themeMap[themeName].feedbackIds.push(item.id);
        themeMap[themeName].confidences.push(confidence);
      }
    }
  }

  // Assign severity based on keywords
  const severityMap = {
    'Performance Issues': 'high',
    'Reliability & Bugs': 'high',
    'Data & Security': 'critical',
    'Pricing Concerns': 'medium',
    'Customer Support': 'medium',
    'Onboarding Experience': 'medium',
    'User Interface / UX': 'medium',
    'Mobile Experience': 'low',
    'Feature Requests': 'low',
    'Positive Feedback': 'low',
  };

  return Object.values(themeMap).map(theme => ({
    ...theme,
    severity: severityMap[theme.name] || 'medium',
    confidence: theme.confidences.reduce((a, b) => a + b, 0) / theme.confidences.length,
    frequency_count: theme.feedbackIds.length,
    missing_evidence: `Based on keyword matching only. AI analysis would provide deeper insight.`,
    follow_up_notes: `Review the ${theme.feedbackIds.length} linked feedback items to validate this theme.`,
  }));
}

/**
 * Extract themes from feedback items
 */
export async function extractThemes(feedbackItems) {
  // Filter out duplicates
  const uniqueItems = feedbackItems.filter(item => !item.is_duplicate);

  if (uniqueItems.length === 0) {
    return [];
  }

  if (!config.isDemoMode) {
    try {
      const aiThemes = await generateThemes(uniqueItems);
      return aiThemes.map(theme => ({
        id: uuidv4(),
        ...theme,
      }));
    } catch (err) {
      console.warn('AI theme extraction failed, falling back to keyword-based:', err.message);
    }
  }

  return extractThemesDemo(feedbackItems);
}
