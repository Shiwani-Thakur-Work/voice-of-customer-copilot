/**
 * Export Service
 * Generates product discovery summaries in Markdown and JSON formats.
 */

export function generateMarkdownReport(themes, feedbackMap, metadata = {}) {
  const date = new Date().toISOString().split('T')[0];

  let md = `# Product Discovery Summary\n\n`;
  md += `> Generated on ${date} by Voice of Customer Copilot\n\n`;
  md += `---\n\n`;

  // Overview
  md += `## Overview\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Themes Analyzed | ${themes.length} |\n`;
  md += `| Total Feedback Items | ${metadata.totalFeedback || 'N/A'} |\n`;
  md += `| Unique (Non-Duplicate) | ${metadata.uniqueFeedback || 'N/A'} |\n`;
  md += `| Date Range | ${metadata.dateRange || 'N/A'} |\n\n`;

  md += `---\n\n`;

  // Themes
  md += `## Themes\n\n`;

  themes.forEach((theme, index) => {
    md += `### ${index + 1}. ${theme.name}\n\n`;
    md += `**Severity:** ${theme.severity} | **Frequency:** ${theme.frequency_count} mentions | **Confidence:** ${Math.round(theme.confidence * 100)}%`;

    if (theme.priority_score !== undefined) {
      md += ` | **Priority Score:** ${theme.priority_score}`;
    }
    md += `\n\n`;

    if (theme.description) {
      md += `${theme.description}\n\n`;
    }

    // Supporting evidence
    const feedback = feedbackMap[theme.id] || [];
    if (feedback.length > 0) {
      md += `**Supporting Feedback (${feedback.length} items):**\n\n`;
      feedback.slice(0, 5).forEach(fb => {
        md += `> "${fb.raw_text}"\n`;
        if (fb.user_segment) md += `> — _${fb.user_segment}_\n`;
        md += `\n`;
      });
      if (feedback.length > 5) {
        md += `_...and ${feedback.length - 5} more items_\n\n`;
      }
    }

    if (theme.missing_evidence) {
      md += `**Missing Evidence:** ${theme.missing_evidence}\n\n`;
    }

    if (theme.follow_up_notes) {
      md += `**Recommended Follow-up:** ${theme.follow_up_notes}\n\n`;
    }

    md += `---\n\n`;
  });

  return md;
}

export function generateJSONReport(themes, feedbackMap, metadata = {}) {
  return {
    generated_at: new Date().toISOString(),
    metadata,
    themes: themes.map(theme => ({
      name: theme.name,
      description: theme.description,
      severity: theme.severity,
      frequency_count: theme.frequency_count,
      confidence: theme.confidence,
      priority_score: theme.priority_score,
      status: theme.status,
      missing_evidence: theme.missing_evidence,
      follow_up_notes: theme.follow_up_notes,
      supporting_feedback: (feedbackMap[theme.id] || []).map(fb => ({
        text: fb.raw_text,
        segment: fb.user_segment,
        source: fb.source,
      })),
    })),
  };
}
