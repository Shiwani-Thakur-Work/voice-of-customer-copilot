/**
 * Deduplication Service
 * Detects near-duplicate feedback using text similarity.
 * Uses Gemini embeddings when available, falls back to n-gram similarity.
 */
import { generateEmbeddings } from '../ai/embeddings.js';
import config from '../config.js';

/**
 * Simple n-gram based similarity (fallback when no API key)
 */
// Stopwords to ignore in bag-of-words similarity
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'for', 'with', 'on', 'at', 'by', 'from',
  'of', 'in', 'out', 'this', 'that', 'these', 'those', 'it', 'its', 'we', 'our', 'us', 'i', 'my', 'me', 'you', 'your'
]);

function stem(word) {
  return word
    .replace(/(ing|edly|able|ible|tion|ment|ness|less|ful|ies|ed|es|s)$/g, '')
    .trim();
}

function getTokens(text) {
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  return new Set(
    lower
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
      .map(stem)
      .filter(w => w.length > 2)
  );
}

function tokenOverlap(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let matches = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      matches++;
    } else {
      // Check prefix/stem match
      for (const target of setB) {
        if (target.startsWith(item) || item.startsWith(target)) {
          matches += 0.85;
          break;
        }
      }
    }
  }
  return matches / Math.min(setA.size, setB.size);
}

function charBigramSimilarity(strA, strB) {
  const cleanA = strA.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanB = strB.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanA.length < 2 || cleanB.length < 2) return 0;

  const getBigrams = s => {
    const bg = new Set();
    for (let i = 0; i < s.length - 1; i++) bg.add(s.slice(i, i + 2));
    return bg;
  };

  const bgA = getBigrams(cleanA);
  const bgB = getBigrams(cleanB);
  let intersection = 0;
  for (const b of bgA) {
    if (bgB.has(b)) intersection++;
  }
  return (2.0 * intersection) / (bgA.size + bgB.size);
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find duplicates in a list of feedback items
 * Returns items with is_duplicate and duplicate_of_id set
 */
export async function findDuplicates(feedbackItems) {
  const threshold = config.similarity.duplicateThreshold;
  const results = feedbackItems.map(item => ({ ...item, is_duplicate: 0, duplicate_of_id: null }));
  let duplicateCount = 0;

  if (!config.isDemoMode) {
    // Use Gemini embeddings
    try {
      const texts = results.map(r => r.normalized_text || r.raw_text);
      const embeddings = await generateEmbeddings(texts);

      for (let i = 0; i < results.length; i++) {
        if (results[i].is_duplicate) continue;
        for (let j = i + 1; j < results.length; j++) {
          if (results[j].is_duplicate) continue;
          const sim = cosineSimilarity(embeddings[i], embeddings[j]);
          if (sim > threshold) {
            results[j].is_duplicate = 1;
            results[j].duplicate_of_id = results[i].id;
            duplicateCount++;
          }
        }
      }
      return { items: results, duplicateCount };
    } catch (err) {
      console.warn('Embedding-based deduplication failed, falling back to heuristic similarity:', err.message);
    }
  }

  // Fallback heuristic: token overlap & character bigram similarity
  const tokenSets = results.map(r => getTokens(r.normalized_text || r.raw_text));

  for (let i = 0; i < results.length; i++) {
    if (results[i].is_duplicate) continue;
    const textI = results[i].normalized_text || results[i].raw_text;

    for (let j = i + 1; j < results.length; j++) {
      if (results[j].is_duplicate) continue;
      const textJ = results[j].normalized_text || results[j].raw_text;

      const overlap = tokenOverlap(tokenSets[i], tokenSets[j]);
      const charSim = charBigramSimilarity(textI, textJ);

      // Duplicate criteria: high token overlap (>= 0.6) or high char bigram similarity (>= 0.55)
      if (overlap >= 0.6 || charSim >= 0.55) {
        results[j].is_duplicate = 1;
        results[j].duplicate_of_id = results[i].id;
        duplicateCount++;
      }
    }
  }

  return { items: results, duplicateCount };
}
