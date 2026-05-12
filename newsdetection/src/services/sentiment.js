import { HfInference } from "@huggingface/inference";

const hf = new HfInference(import.meta.env.VITE_HF_TOKEN);

const LABEL_MAP = {
  LABEL_0: "Negative",
  LABEL_1: "Neutral",
  LABEL_2: "Positive",
};

const MANIPULATION_PATTERNS = [
  { pattern: /!!!|\?{2,}/, label: "Excessive punctuation", penalty: 5 },
  { pattern: /wake up|sheeple|mainstream media lies|cover[- ]?up|they don't want you to know/i, label: "Conspiracy language", penalty: 12 },
  { pattern: /share this|forward this|must read|before it.{0,10}delete/i, label: "Urgency/share tactics", penalty: 10 },
  { pattern: /exposed|shocking|unbelievable|you won't believe|mind.?blowing/i, label: "Sensationalist framing", penalty: 8 },
  { pattern: /miracle|cure|secret|banned|they don't want/i, label: "Miracle/suppression claims", penalty: 10 },
  { pattern: /100%|guaranteed|undeniable|proven beyond doubt/i, label: "Absolute certainty claims", penalty: 6 },
  { pattern: /(?:[A-Z]{3,}\s){3,}/, label: "Excessive capitalization", penalty: 5 },
  { pattern: /deep state|big pharma|new world order|globalist/i, label: "Conspiracy theory markers", penalty: 15 },
  { pattern: /BREAKING|URGENT|ALERT|JUST IN/i, label: "False urgency signals", penalty: 7 },
];

export const analyzeSentiment = async (text) => {
  try {
    const truncated = text.substring(0, 1500);

    const result = await hf.textClassification({
      model: "cardiffnlp/twitter-roberta-base-sentiment",
      inputs: truncated,
    });

    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error("Empty sentiment response.");
    }

    const breakdown = {};
    result.forEach((r) => {
      const label = LABEL_MAP[r?.label] || r?.label || "Unknown";
      breakdown[label] = Math.round((r?.score || 0) * 100);
    });

    const topResult = result[0];
    const dominantLabel = LABEL_MAP[topResult?.label] || topResult?.label || "Unknown";
    const dominantScore = Math.round((topResult?.score || 0) * 100);

    const neutralScore = breakdown["Neutral"] || 0;
    const negativeScore = breakdown["Negative"] || 0;
    const positiveScore = breakdown["Positive"] || 0;
    const emotionalIntensity = Math.max(0, 100 - neutralScore);

    // Enhanced manipulation detection combining sentiment + text patterns
    let detectionScore = 0;
    const detectedPatterns = [];

    MANIPULATION_PATTERNS.forEach(({ pattern, label, penalty }) => {
      if (pattern.test(text)) {
        detectionScore += penalty;
        detectedPatterns.push(label);
      }
    });

    // Heuristic: high negative + high intensity = manipulation
    if (negativeScore >= 60 && emotionalIntensity >= 60) {
      detectionScore += 15;
      detectedPatterns.push("High negative emotional manipulation");
    }

    // Very low neutral = polarized = suspicious
    if (neutralScore < 20 && emotionalIntensity > 80) {
      detectionScore += 10;
      detectedPatterns.push("Extreme polarization");
    }

    let manipulationLevel = "Low";
    if (detectionScore >= 30) manipulationLevel = "High";
    else if (detectionScore >= 18) manipulationLevel = "Moderate";
    else if (detectionScore >= 8) manipulationLevel = "Low-Moderate";

    let sentimentLabel = dominantLabel;
    if (dominantLabel === "Negative" && dominantScore >= 80) {
      sentimentLabel = "Highly Negative";
    } else if (dominantLabel === "Positive" && dominantScore >= 80) {
      sentimentLabel = "Highly Positive";
    } else if (dominantLabel === "Neutral" && dominantScore >= 70) {
      sentimentLabel = "Neutral";
    }

    return {
      sentiment: sentimentLabel,
      sentimentScore: dominantScore,
      manipulationLevel,
      manipulationScore: detectionScore,
      emotionalIntensity,
      negativeScore,
      positiveScore,
      neutralScore,
      detectedPatterns,
      breakdown,
    };
  } catch (err) {
    console.error("[SENTIMENT] Sentiment analysis failed:", err);
    return {
      sentiment: "Unknown",
      sentimentScore: 0,
      manipulationLevel: "Unknown",
      manipulationScore: 0,
      emotionalIntensity: 0,
      negativeScore: 0,
      positiveScore: 0,
      neutralScore: 0,
      detectedPatterns: [],
      breakdown: {},
      error: err?.message || "Sentiment model unavailable",
    };
  }
};
