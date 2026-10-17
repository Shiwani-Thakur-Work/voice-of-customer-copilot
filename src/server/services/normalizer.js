/**
 * Text Normalizer Service
 * Cleans and normalizes raw feedback text for consistent processing.
 */

// Patterns for basic PII removal
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

// Smart quotes and encoding fixes
const ENCODING_FIXES = [
  [/\u2018|\u2019/g, "'"],   // Smart single quotes
  [/\u201C|\u201D/g, '"'],   // Smart double quotes
  [/\u2013/g, '-'],          // En dash
  [/\u2014/g, '--'],         // Em dash
  [/\u2026/g, '...'],        // Ellipsis
  [/\u00A0/g, ' '],          // Non-breaking space
  [/\uFEFF/g, ''],           // BOM
];

export function normalizeText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // Fix encoding
  for (const [pattern, replacement] of ENCODING_FIXES) {
    text = text.replace(pattern, replacement);
  }

  // Remove PII
  text = text.replace(EMAIL_REGEX, '[email]');
  text = text.replace(PHONE_REGEX, '[phone]');
  text = text.replace(URL_REGEX, '[url]');

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Remove excessive punctuation (but keep meaningful ones)
  text = text.replace(/([!?.]){3,}/g, '$1$1');

  return text;
}

export function normalizeBatch(feedbackItems) {
  return feedbackItems.map(item => ({
    ...item,
    normalized_text: normalizeText(item.raw_text),
  }));
}
