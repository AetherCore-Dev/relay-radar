/**
 * Feature Extractor — Extract 15-dimension behavioral fingerprint from any LLM response.
 *
 * Philosophy: "Homework, not exams"
 * Instead of sending special probe queries, we analyze the model's normal responses.
 * Different models have characteristic "writing DNA" across these dimensions,
 * even when responding to identical user prompts.
 *
 * References:
 *   - "Invisible Traces" (arXiv:2501.18712) — hybrid fingerprinting, 86.5% at n=10
 *   - "Behavioral Holography" — high-dimensional behavioral fingerprinting
 *   - IMMACULATE (arXiv:2602.22700) — practical LLM API auditing
 *
 * Zero external dependencies. Pure string analysis.
 */

/**
 * Extract a 15-dimension feature vector from a single LLM response.
 * Each feature captures a different behavioral signal.
 *
 * @param {string} text — The full response text
 * @returns {Readonly<number[]>} — 15-element feature vector, all values normalized to [0, 1]
 */
export function extractFeatures(text) {
  if (!text || typeof text !== 'string') {
    return Object.freeze(new Array(15).fill(0));
  }

  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim());
  const lines = text.split('\n');
  const wordCount = words.length;
  const charCount = text.length;

  return Object.freeze([
    // ─── Structural (0-4) ─────────────────────────────
    // 0: Response length (log-normalized)
    normalize(Math.log(charCount + 1), 0, 10),

    // 1: Line count (log-normalized)
    normalize(Math.log(lines.length + 1), 0, 7),

    // 2: Code block density — fraction of text inside ``` blocks
    codeBlockDensity(text),

    // 3: Markdown richness — headers, bold, lists per 100 words
    markdownRichness(text, wordCount),

    // 4: Paragraph count (normalized)
    normalize(text.split(/\n\n+/).filter(Boolean).length, 1, 20),

    // ─── Lexical (5-8) ──────────────────────────────────
    // 5: Vocabulary richness (type-token ratio)
    wordCount > 0 ? new Set(words.map(w => w.toLowerCase())).size / wordCount : 0,

    // 6: Average sentence length (words per sentence)
    normalize(sentences.length > 0 ? wordCount / sentences.length : 0, 0, 40),

    // 7: Average word length (characters per word)
    normalize(wordCount > 0 ? words.reduce((s, w) => s + w.length, 0) / wordCount : 0, 0, 12),

    // 8: Long word ratio (words > 8 chars)
    wordCount > 0 ? words.filter(w => w.length > 8).length / wordCount : 0,

    // ─── Stylistic (9-12) ────────────────────────────────
    // 9: Hedging language rate ("perhaps", "might", "it's worth noting")
    hedgingRate(text, wordCount),

    // 10: Confidence language rate ("definitely", "always", "certainly")
    confidenceRate(text, wordCount),

    // 11: First-person rate ("I", "I'll", "I can", "my")
    firstPersonRate(text, wordCount),

    // 12: Transition word rate ("however", "therefore", "additionally")
    transitionRate(text, wordCount),

    // ─── Code-specific (13-14) ───────────────────────────
    // 13: Code-to-prose ratio
    codeBlockDensity(text) > 0 ? codeBlockDensity(text) : 0,

    // 14: Comment density in code blocks
    codeCommentDensity(text),
  ]);
}

/** Feature dimension names for debugging/display */
export const FEATURE_NAMES = Object.freeze([
  'responseLength', 'lineCount', 'codeBlockDensity', 'markdownRichness',
  'paragraphCount', 'vocabRichness', 'avgSentenceLength', 'avgWordLength',
  'longWordRatio', 'hedgingRate', 'confidenceRate', 'firstPersonRate',
  'transitionRate', 'codeProsRatio', 'codeCommentDensity',
]);

export const FEATURE_COUNT = 15;

// ─── Feature Helpers ─────────────────────────────────────────────────────────

function normalize(value, min, max) {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function codeBlockDensity(text) {
  const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
  const codeChars = codeBlocks.reduce((s, b) => s + b.length, 0);
  return text.length > 0 ? Math.min(1, codeChars / text.length) : 0;
}

function markdownRichness(text, wordCount) {
  if (wordCount === 0) return 0;
  const headers = (text.match(/^#{1,6}\s/gm) || []).length;
  const bolds = (text.match(/\*\*[^*]+\*\*/g) || []).length;
  const lists = (text.match(/^[-*]\s/gm) || []).length;
  const per100 = ((headers + bolds + lists) / wordCount) * 100;
  return Math.min(1, per100 / 10); // normalize: 10 elements per 100 words = 1.0
}

const HEDGING_WORDS = /\b(perhaps|maybe|might|could|possibly|arguably|it seems|it appears|it's worth noting|tend to|in some cases|generally|typically|often|usually|may)\b/gi;
function hedgingRate(text, wordCount) {
  if (wordCount === 0) return 0;
  const matches = (text.match(HEDGING_WORDS) || []).length;
  return Math.min(1, (matches / wordCount) * 50); // normalize: 2% = 1.0
}

const CONFIDENCE_WORDS = /\b(definitely|certainly|always|never|absolutely|clearly|obviously|undoubtedly|must|will always)\b/gi;
function confidenceRate(text, wordCount) {
  if (wordCount === 0) return 0;
  const matches = (text.match(CONFIDENCE_WORDS) || []).length;
  return Math.min(1, (matches / wordCount) * 100); // normalize: 1% = 1.0
}

const FIRST_PERSON = /\b(I|I'll|I'd|I'm|I've|my|me|mine)\b/g;
function firstPersonRate(text, wordCount) {
  if (wordCount === 0) return 0;
  const matches = (text.match(FIRST_PERSON) || []).length;
  return Math.min(1, (matches / wordCount) * 20); // normalize: 5% = 1.0
}

const TRANSITION_WORDS = /\b(however|therefore|additionally|furthermore|moreover|nevertheless|consequently|meanwhile|specifically|alternatively|in contrast|on the other hand|that said)\b/gi;
function transitionRate(text, wordCount) {
  if (wordCount === 0) return 0;
  const matches = (text.match(TRANSITION_WORDS) || []).length;
  return Math.min(1, (matches / wordCount) * 100); // normalize: 1% = 1.0
}

function codeCommentDensity(text) {
  const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
  if (codeBlocks.length === 0) return 0;
  const code = codeBlocks.join('\n');
  const codeLines = code.split('\n').filter(l => l.trim() && !l.includes('```'));
  const commentLines = codeLines.filter(l => /^\s*(\/\/|#|\/\*|\*|<!--)/.test(l));
  return codeLines.length > 0 ? commentLines.length / codeLines.length : 0;
}
