/**
 * Prompt Templates for Gemini AI
 */

export const THEME_EXTRACTION_PROMPT = `You are a product research analyst. Analyze the following customer feedback items and identify recurring themes.

For each theme, provide:
- name: A short, clear theme name
- description: 2-3 sentence description of the theme
- severity: One of "low", "medium", "high", "critical"
- confidence: A number between 0 and 1 indicating how confident you are in this classification
- feedback_indices: Array of feedback item numbers (1-indexed) that belong to this theme
- missing_evidence: What additional data would strengthen this finding
- follow_up_notes: Suggested next steps for the product team

Rules:
- A feedback item can belong to multiple themes
- Do NOT fabricate quotes or supporting statements
- Frequency should NOT automatically determine severity
- Flag contradictory feedback explicitly
- Be honest about uncertainty

Return ONLY a JSON array of theme objects wrapped in \`\`\`json code blocks.

Customer Feedback:
{{FEEDBACK}}`;

export const THEME_ENRICHMENT_PROMPT = `You are a product research analyst. Given the following theme and its supporting feedback, provide enriched analysis.

Theme: {{THEME_NAME}}
Current Description: {{THEME_DESCRIPTION}}

Supporting Feedback:
{{FEEDBACK}}

Provide a JSON object with:
- description: Updated, more detailed description (2-3 sentences)
- severity: One of "low", "medium", "high", "critical" based on user impact
- missing_evidence: What data is missing to fully understand this issue
- follow_up_notes: Specific research or interview questions to pursue

Return ONLY a JSON object wrapped in \`\`\`json code blocks.`;
