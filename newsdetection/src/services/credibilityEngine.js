/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * LAYER 4 — CREDIBILITY SCORING ENGINE
 * Purpose: Weighted aggregation of all AI layer outputs
 * into a unified credibility score and risk classification
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/**
 * Weight configuration for each AI layer.
 * These weights determine how much each model contributes to the final score.
 * Must sum to 1.0.
 */
const WEIGHTS = {
  fakeNewsClassifier: 0.40,
  sentimentManipulation: 0.20,
  llmReasoning: 0.20,
  sourceReliability: 0.20,
};

/**
 * Risk level thresholds (based on final credibility score)
 */
const RISK_THRESHOLDS = {
  SAFE: 75,
  MODERATE: 50,
  SUSPICIOUS: 25,
  // Below 25 = HIGH RISK
};

/**
 * Detects basic source reliability signals from the text.
 * This is a heuristic-based layer that checks for common
 * indicators of reliable vs unreliable content.
 *
 * @param {string} text - Original input text
 * @returns {{ score: number, signals: string[] }}
 */
const analyzeSourceReliability = (text) => {
  const lowerText = text.toLowerCase();
  let score = 50; // Start neutral
  const signals = [];

  // Positive signals (increase credibility)
  const positivePatterns = [
    { pattern: /according to|cited by|published by/i, label: "Attribution present", boost: 8 },
    { pattern: /https?:\/\/[^\s]+/i, label: "Contains source URLs", boost: 5 },
    { pattern: /study|research|data shows|statistics/i, label: "References data/research", boost: 7 },
    { pattern: /reuters|ap news|associated press|bbc|nyt|washington post/i, label: "References major outlets", boost: 10 },
    { pattern: /peer[- ]reviewed|journal|published in/i, label: "Academic references", boost: 10 },
    { pattern: /official statement|press release|government/i, label: "Official source reference", boost: 6 },
  ];

  // Negative signals (decrease credibility)
  const negativePatterns = [
    { pattern: /breaking|urgent|share before deleted|they don't want you to know/i, label: "Urgency/suppression tactics", penalty: 12 },
    { pattern: /exposed|shocking|unbelievable|you won't believe/i, label: "Sensationalist language", penalty: 10 },
    { pattern: /miracle|cure|secret|banned/i, label: "Miracle/conspiracy claims", penalty: 12 },
    { pattern: /wake up|sheeple|mainstream media lies|cover[- ]?up/i, label: "Conspiracy language", penalty: 15 },
    { pattern: /!!!|[A-Z]{10,}/i, label: "Excessive emphasis", penalty: 8 },
    { pattern: /forward this|share this now|must read/i, label: "Chain message tactics", penalty: 10 },
    { pattern: /100% proven|guaranteed|undeniable/i, label: "Absolute claims", penalty: 8 },
    { pattern: /deep state|big pharma|new world order/i, label: "Conspiracy theory markers", penalty: 15 },
  ];

  positivePatterns.forEach(({ pattern, label, boost }) => {
    if (pattern.test(text)) {
      score += boost;
      signals.push(`✓ ${label}`);
    }
  });

  negativePatterns.forEach(({ pattern, label, penalty }) => {
    if (pattern.test(text)) {
      score -= penalty;
      signals.push(`✗ ${label}`);
    }
  });

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return { score, signals };
};

/**
 * Computes the final weighted credibility score and risk classification.
 *
 * @param {object} params
 * @param {string} params.text - Original user input
 * @param {object} params.classifierResult - Layer 1 output
 * @param {object} params.sentimentResult - Layer 2 output
 * @param {object} params.reasoningResult - Layer 3 output
 * @returns {{ credibilityScore: number, riskLevel: string, fakeProbability: number, sentiment: string, manipulationLevel: string, emotionalIntensity: number, explanation: string, verdict: string, flags: string[], sourceSignals: string[], layerBreakdown: object }}
 */
export const computeCredibility = ({
  text,
  classifierResult = {},
  sentimentResult = {},
  reasoningResult = {},
}) => {
  // ── Layer 1 Score: Fake News Classifier ──
  // If label is FAKE, the "credibility" from this layer is (100 - confidence)
  // If label is REAL, the "credibility" is confidence directly
  const classLabel = classifierResult?.label?.toUpperCase() || "UNKNOWN";
  const classConfidence = classifierResult?.confidence || 0;
  const classifierCredibility =
    classLabel === "FAKE"
      ? Math.max(0, 100 - classConfidence)
      : classLabel === "REAL"
      ? classConfidence
      : 50; // Unknown → neutral

  // ── Layer 2 Score: Sentiment & Manipulation ──
  // Low manipulation = high credibility, high manipulation = low credibility
  const manipLevel = sentimentResult?.manipulationLevel?.toLowerCase() || "unknown";
  let sentimentCredibility = 50;
  if (manipLevel === "low") sentimentCredibility = 85;
  else if (manipLevel === "low-moderate") sentimentCredibility = 65;
  else if (manipLevel === "moderate") sentimentCredibility = 45;
  else if (manipLevel === "high") sentimentCredibility = 15;

  // ── Layer 3 Score: LLM Reasoning ──
  const reasoningConfidence = reasoningResult?.confidence || 50;
  const verdictStr = reasoningResult?.verdict?.toUpperCase() || "UNCERTAIN";
  let reasoningCredibility = reasoningConfidence;
  // Adjust based on verdict
  if (verdictStr.includes("VERIFIED")) reasoningCredibility = Math.max(reasoningCredibility, 80);
  if (verdictStr.includes("SUSPICIOUS")) reasoningCredibility = Math.min(reasoningCredibility, 30);
  if (verdictStr.includes("HIGHLY SUSPICIOUS")) reasoningCredibility = Math.min(reasoningCredibility, 15);

  // ── Layer 4 Score: Source Reliability ──
  const sourceAnalysis = analyzeSourceReliability(text);

  // ── WEIGHTED AGGREGATION ──
  const finalScore = Math.round(
    classifierCredibility * WEIGHTS.fakeNewsClassifier +
    sentimentCredibility * WEIGHTS.sentimentManipulation +
    reasoningCredibility * WEIGHTS.llmReasoning +
    sourceAnalysis.score * WEIGHTS.sourceReliability
  );

  // Clamp
  const credibilityScore = Math.max(0, Math.min(100, finalScore));

  // ── RISK LEVEL ──
  let riskLevel = "HIGH RISK";
  if (credibilityScore >= RISK_THRESHOLDS.SAFE) riskLevel = "SAFE";
  else if (credibilityScore >= RISK_THRESHOLDS.MODERATE) riskLevel = "MODERATE";
  else if (credibilityScore >= RISK_THRESHOLDS.SUSPICIOUS) riskLevel = "SUSPICIOUS";

  // ── FAKE PROBABILITY ──
  const fakeProbability =
    classLabel === "FAKE"
      ? classConfidence
      : classLabel === "REAL"
      ? 100 - classConfidence
      : 50;

  // ── COMPILE FLAGS ──
  const allFlags = [...(reasoningResult?.flags || [])];
  // Add source-based flags
  sourceAnalysis.signals
    .filter((s) => s.startsWith("✗"))
    .forEach((s) => allFlags.push(s.replace("✗ ", "")));
  // Deduplicate
  const uniqueFlags = [...new Set(allFlags)];

  return {
    credibilityScore,
    riskLevel,
    fakeProbability,
    sentiment: sentimentResult?.sentiment || "Unknown",
    manipulationLevel: sentimentResult?.manipulationLevel || "Unknown",
    emotionalIntensity: sentimentResult?.emotionalIntensity || 0,
    explanation: reasoningResult?.explanation || "No explanation available.",
    verdict: reasoningResult?.verdict || "UNCERTAIN",
    flags: uniqueFlags,
    sourceSignals: sourceAnalysis.signals,
    layerBreakdown: {
      classifier: { score: classifierCredibility, weight: WEIGHTS.fakeNewsClassifier, label: classLabel, confidence: classConfidence },
      sentiment: { score: sentimentCredibility, weight: WEIGHTS.sentimentManipulation },
      reasoning: { score: reasoningCredibility, weight: WEIGHTS.llmReasoning },
      source: { score: sourceAnalysis.score, weight: WEIGHTS.sourceReliability },
    },
  };
};
