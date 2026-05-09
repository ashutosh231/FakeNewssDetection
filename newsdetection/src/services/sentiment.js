/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * LAYER 2 — SENTIMENT & MANIPULATION DETECTION
 * Model: cardiffnlp/twitter-roberta-base-sentiment
 * Purpose: Emotional tone analysis & manipulation detection
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { HfInference } from "@huggingface/inference";

const hf = new HfInference(import.meta.env.VITE_HF_TOKEN);

// Label mapping for the Twitter RoBERTa sentiment model
const LABEL_MAP = {
  LABEL_0: "Negative",
  LABEL_1: "Neutral",
  LABEL_2: "Positive",
};

/**
 * Analyzes the sentiment and emotional manipulation level of input text.
 * @param {string} text - Content to analyze
 * @returns {Promise<{ sentiment: string, sentimentScore: number, manipulationLevel: string, emotionalIntensity: number, breakdown: object }>}
 */
export const analyzeSentiment = async (text) => {
  try {
    // Truncate to model limit (~512 tokens ≈ 1500 chars for tweets-trained model)
    const truncated = text.substring(0, 1500);

    const result = await hf.textClassification({
      model: "cardiffnlp/twitter-roberta-base-sentiment",
      inputs: truncated,
    });

    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error("Empty sentiment response.");
    }

    // Build full breakdown
    const breakdown = {};
    result.forEach((r) => {
      const label = LABEL_MAP[r?.label] || r?.label || "Unknown";
      breakdown[label] = Math.round((r?.score || 0) * 100);
    });

    // Determine dominant sentiment
    const topResult = result[0];
    const dominantLabel =
      LABEL_MAP[topResult?.label] || topResult?.label || "Unknown";
    const dominantScore = Math.round((topResult?.score || 0) * 100);

    // Calculate emotional intensity (how far from neutral the text is)
    const neutralScore = breakdown["Neutral"] || 0;
    const negativeScore = breakdown["Negative"] || 0;
    const positiveScore = breakdown["Positive"] || 0;
    const emotionalIntensity = Math.max(0, 100 - neutralScore);

    // Determine manipulation level based on heuristics:
    // - High negative sentiment + high intensity = likely manipulation
    // - Strong polarization (low neutral) = potentially manipulative
    let manipulationLevel = "Low";
    if (negativeScore >= 70 && emotionalIntensity >= 60) {
      manipulationLevel = "High";
    } else if (negativeScore >= 50 || emotionalIntensity >= 70) {
      manipulationLevel = "Moderate";
    } else if (emotionalIntensity >= 50) {
      manipulationLevel = "Low-Moderate";
    }

    // Generate human-readable sentiment label
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
      emotionalIntensity,
      negativeScore,
      positiveScore,
      neutralScore,
      breakdown,
      raw: result,
    };
  } catch (err) {
    console.error("[SENTIMENT] Sentiment analysis failed:", err);
    return {
      sentiment: "Unknown",
      sentimentScore: 0,
      manipulationLevel: "Unknown",
      emotionalIntensity: 0,
      negativeScore: 0,
      positiveScore: 0,
      neutralScore: 0,
      breakdown: {},
      raw: null,
      error: err?.message || "Sentiment model unavailable",
    };
  }
};
