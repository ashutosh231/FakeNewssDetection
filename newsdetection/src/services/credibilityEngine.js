const WEIGHTS = {
  fakeNewsClassifier: 0.35,
  sentimentManipulation: 0.15,
  llmReasoning: 0.30,
  sourceReliability: 0.20,
};

const RISK_THRESHOLDS = {
  SAFE: 70,
  MODERATE: 50,
  SUSPICIOUS: 30,
};

const analyzeSourceReliability = (text) => {
  const lowerText = text.toLowerCase();
  let score = 50;
  const signals = [];

  const positivePatterns = [
    { pattern: /according to|cited by|published by/i, label: "Attribution present", boost: 8 },
    { pattern: /https?:\/\/[^\s]+/i, label: "Contains source URLs", boost: 6 },
    { pattern: /study|research|data shows|statistics|survey/i, label: "References data/research", boost: 8 },
    { pattern: /reuters|ap news|associated press|bbc|nyt|washington post|guardian/i, label: "References major outlets", boost: 10 },
    { pattern: /peer[- ]reviewed|journal|published in|university|institute/i, label: "Academic/institutional references", boost: 12 },
    { pattern: /official statement|press release|government|senator|representative/i, label: "Official source reference", boost: 7 },
    { pattern: /\d{4}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2},? \d{4}/i, label: "Contains publication date", boost: 5 },
    { pattern: /[A-Z][a-z]+ [A-Z][a-z]+,? (?:PhD|MD|Dr\.|Professor|Prof\.)/i, label: "Quotes named expert", boost: 6 },
  ];

  const negativePatterns = [
    { pattern: /breaking|urgent|share before|they don't want you to know/i, label: "Urgency/suppression tactics", penalty: 12 },
    { pattern: /exposed|shocking|unbelievable|you won't believe|mind.?blowing/i, label: "Sensationalist language", penalty: 10 },
    { pattern: /miracle|cure|secret|banned/i, label: "Miracle/conspiracy claims", penalty: 12 },
    { pattern: /wake up|sheeple|mainstream media lies|cover[- ]?up/i, label: "Conspiracy language", penalty: 15 },
    { pattern: /!!!|[A-Z]{10,}/i, label: "Excessive emphasis signals", penalty: 8 },
    { pattern: /forward this|share this now|must read|copy and paste/i, label: "Chain message tactics", penalty: 12 },
    { pattern: /100% proven|guaranteed|undeniable|absolute fact/i, label: "Absolute claims", penalty: 8 },
    { pattern: /deep state|big pharma|new world order|globalist|illuminati/i, label: "Conspiracy theory markers", penalty: 15 },
    { pattern: /they are hiding|the truth about|what they don't want/i, label: "Secrecy narrative", penalty: 10 },
    { pattern: /viral|trending|everyone is talking|spread the word/i, label: "Virality bait", penalty: 6 },
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

  return { score: Math.max(0, Math.min(100, score)), signals };
};

export const computeCredibility = ({
  text,
  classifierResult = {},
  sentimentResult = {},
  reasoningResult = {},
}) => {
  const classLabel = classifierResult?.label?.toUpperCase() || "UNKNOWN";
  const classConfidence = classifierResult?.confidence || 0;
  const classifierCredibility =
    classLabel === "FAKE"
      ? Math.max(0, 100 - classConfidence)
      : classLabel === "REAL"
      ? classConfidence
      : 50;

  const manipLevel = sentimentResult?.manipulationLevel?.toLowerCase() || "unknown";
  let sentimentCredibility = 50;
  if (manipLevel === "low") sentimentCredibility = 85;
  else if (manipLevel === "low-moderate") sentimentCredibility = 65;
  else if (manipLevel === "moderate") sentimentCredibility = 40;
  else if (manipLevel === "high") sentimentCredibility = 15;

  const reasoningConfidence = reasoningResult?.confidence || 50;
  const verdictStr = reasoningResult?.verdict?.toUpperCase() || "UNCERTAIN";
  let reasoningCredibility = reasoningConfidence;
  if (verdictStr.includes("VERIFIED")) reasoningCredibility = Math.max(reasoningCredibility, 85);
  if (verdictStr.includes("SUSPICIOUS")) reasoningCredibility = Math.min(reasoningCredibility, 25);
  if (verdictStr.includes("HIGHLY SUSPICIOUS")) reasoningCredibility = Math.min(reasoningCredibility, 10);
  if (verdictStr.includes("MIXED SIGNALS")) reasoningCredibility = Math.min(reasoningCredibility, 55);

  const sourceAnalysis = analyzeSourceReliability(text);

  const finalScore = Math.round(
    classifierCredibility * WEIGHTS.fakeNewsClassifier +
    sentimentCredibility * WEIGHTS.sentimentManipulation +
    reasoningCredibility * WEIGHTS.llmReasoning +
    sourceAnalysis.score * WEIGHTS.sourceReliability
  );

  const credibilityScore = Math.max(0, Math.min(100, finalScore));

  let riskLevel = "HIGH RISK";
  if (credibilityScore >= RISK_THRESHOLDS.SAFE) riskLevel = "SAFE";
  else if (credibilityScore >= RISK_THRESHOLDS.MODERATE) riskLevel = "MODERATE";
  else if (credibilityScore >= RISK_THRESHOLDS.SUSPICIOUS) riskLevel = "SUSPICIOUS";

  const fakeProbability =
    classLabel === "FAKE"
      ? classConfidence
      : classLabel === "REAL"
      ? 100 - classConfidence
      : 50;

  const allFlags = [...(reasoningResult?.flags || [])];
  sourceAnalysis.signals
    .filter((s) => s.startsWith("✗"))
    .forEach((s) => allFlags.push(s.replace("✗ ", "")));
  const uniqueFlags = [...new Set(allFlags)];

  return {
    credibilityScore,
    riskLevel,
    fakeProbability,
    sentiment: sentimentResult?.sentiment || "Unknown",
    manipulationLevel: sentimentResult?.manipulationLevel || "Unknown",
    emotionalIntensity: sentimentResult?.emotionalIntensity || 0,
    manipulationScore: sentimentResult?.manipulationScore || 0,
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
