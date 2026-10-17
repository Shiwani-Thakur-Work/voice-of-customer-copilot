/**
 * CSV Parser Service
 * Parses uploaded CSV files and extracts feedback items with flexible column detection.
 */
import Papa from 'papaparse';
import fs from 'fs';

// Common column name mappings
const COLUMN_MAPS = {
  text: ['feedback', 'text', 'comment', 'review', 'message', 'description', 'content', 'body', 'feedback_text', 'customer_feedback', 'response'],
  source: ['source', 'channel', 'platform', 'origin', 'type', 'feedback_source'],
  segment: ['segment', 'user_segment', 'customer_type', 'plan', 'tier', 'user_type', 'category', 'group'],
  date: ['date', 'created_at', 'timestamp', 'submitted_at', 'created', 'time'],
  user: ['user', 'customer', 'name', 'user_name', 'customer_name', 'email', 'user_id'],
};

function detectColumn(headers, candidates) {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_'));
  for (const candidate of candidates) {
    const idx = lowerHeaders.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  // Partial match
  for (const candidate of candidates) {
    const idx = lowerHeaders.findIndex(h => h.includes(candidate));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

export function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete(results) {
        if (!results.data || results.data.length === 0) {
          return reject(new Error('CSV file is empty or has no valid rows'));
        }

        const headers = results.meta.fields || [];

        // Detect columns
        const columnMapping = {
          text: detectColumn(headers, COLUMN_MAPS.text),
          source: detectColumn(headers, COLUMN_MAPS.source),
          segment: detectColumn(headers, COLUMN_MAPS.segment),
          date: detectColumn(headers, COLUMN_MAPS.date),
          user: detectColumn(headers, COLUMN_MAPS.user),
        };

        // Text column is required
        if (!columnMapping.text) {
          // If no text column detected, use the first column
          columnMapping.text = headers[0];
        }

        const feedbackItems = results.data
          .filter(row => row[columnMapping.text]?.trim())
          .map(row => ({
            raw_text: row[columnMapping.text]?.trim() || '',
            source: row[columnMapping.source]?.trim() || 'csv_import',
            user_segment: row[columnMapping.segment]?.trim() || null,
            metadata_json: JSON.stringify({
              date: row[columnMapping.date] || null,
              user: row[columnMapping.user] || null,
              ...(Object.fromEntries(
                headers
                  .filter(h => !Object.values(columnMapping).includes(h))
                  .map(h => [h, row[h]])
              )),
            }),
          }));

        resolve({
          items: feedbackItems,
          totalRows: results.data.length,
          parsedCount: feedbackItems.length,
          columnMapping,
          headers,
          preview: results.data.slice(0, 5),
        });
      },
      error(err) {
        reject(new Error(`CSV parsing failed: ${err.message}`));
      },
    });
  });
}
