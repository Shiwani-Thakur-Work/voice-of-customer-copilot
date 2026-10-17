/**
 * Embedding Utilities
 * Generates text embeddings using Gemini embedding model.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config.js';

let genAI = null;

function getClient() {
  if (!genAI && config.geminiApiKey) {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

/**
 * Generate embeddings for a batch of texts
 */
export async function generateEmbeddings(texts) {
  const client = getClient();
  if (!client) throw new Error('Gemini API key not configured');

  const model = client.getGenerativeModel({ model: 'text-embedding-004' });

  const embeddings = [];
  // Process in batches of 100
  const batchSize = 100;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const result = await model.batchEmbedContents({
      requests: batch.map(text => ({
        content: { parts: [{ text }] },
        taskType: 'SEMANTIC_SIMILARITY',
      })),
    });
    embeddings.push(...result.embeddings.map(e => e.values));
  }

  return embeddings;
}
