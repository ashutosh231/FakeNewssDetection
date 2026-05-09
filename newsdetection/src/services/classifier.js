/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * LAYER 1 — FAKE NEWS CLASSIFIER
 * Model: hamzab/roberta-fake-news-classification
 * Purpose: Binary fake/real classification with confidence
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { HfInference } from "@huggingface/inference";

const hf = new HfInference(import.meta.env.VITE_HF_TOKEN);

/**
 * Classifies text as FAKE or REAL using a fine-tuned RoBERTa model.
 * @param {string} text - The news content to classify
 * @returns {Promise<{ label: string, confidence: number, scores: object }>}
 */
export const classifyFakeNews = async (text) => {
  try {
    // Truncate to model's max token limit (~512 tokens ≈ 2000 chars)
    const truncated = text.substring(0, 2000);

    const result = await hf.textClassification({
      model: "hamzab/roberta-fake-news-classification",
      inputs: truncated,
    });

    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error("Empty classification response.");
    }

    // result is an array of { label, score } sorted by score desc
    const topResult = result[0];
    const allScores = {};
    result.forEach((r) => {
      allScores[r?.label || "unknown"] = Math.round((r?.score || 0) * 100);
    });

    // Normalize label — model may return "FAKE"/"REAL" or "LABEL_0"/"LABEL_1"
    let normalizedLabel = topResult?.label?.toUpperCase() || "UNKNOWN";
    if (normalizedLabel === "LABEL_0") normalizedLabel = "REAL";
    if (normalizedLabel === "LABEL_1") normalizedLabel = "FAKE";

    return {
      label: normalizedLabel,
      confidence: Math.round((topResult?.score || 0) * 100),
      scores: allScores,
      raw: result,
    };
  } catch (err) {
    console.error("[CLASSIFIER] Fake news classification failed:", err);
    return {
      label: "UNKNOWN",
      confidence: 0,
      scores: {},
      raw: null,
      error: err?.message || "Classification model unavailable",
    };
  }
};
