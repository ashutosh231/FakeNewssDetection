/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ORCHESTRATOR — Multi-Model AI Pipeline Controller
 * 
 * Coordinates all 4 AI layers into a unified analysis pipeline:
 *   1. Fake News Classifier  (hamzab/roberta-fake-news-classification)
 *   2. Sentiment Analysis     (cardiffnlp/twitter-roberta-base-sentiment)
 *   3. LLM Reasoning Engine   (meta-llama/Meta-Llama-3-8B-Instruct)
 *   4. Credibility Scoring    (weighted aggregation engine)
 *
 * Pipeline flow:
 *   User Input → [Layer 1 + Layer 2] (parallel) → Layer 3 (uses L1+L2 context) → Layer 4 (final scoring)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { classifyFakeNews } from "./classifier";
import { analyzeSentiment } from "./sentiment";
import { generateReasoning } from "./reasoning";
import { computeCredibility } from "./credibilityEngine";

/**
 * Runs the full multi-model misinformation analysis pipeline.
 *
 * @param {string} text - User input (news article, claim, URL, social media post)
 * @returns {Promise<object>} Unified analysis result
 */
export const runAnalysisPipeline = async (text) => {
  if (!text || typeof text !== "string" || !text.trim()) {
    return {
      credibilityScore: 0,
      riskLevel: "HIGH RISK",
      fakeProbability: 0,
      sentiment: "Unknown",
      manipulationLevel: "Unknown",
      emotionalIntensity: 0,
      explanation: "No content was provided for analysis.",
      verdict: "NO INPUT",
      flags: ["Empty input"],
      sourceSignals: [],
      layerBreakdown: {},
      errors: ["No input text provided"],
    };
  }

  const trimmedText = text.trim();
  const errors = [];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 1: Run Layer 1 + Layer 2 in PARALLEL
  // These models are independent and can execute simultaneously
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let classifierResult, sentimentResult;

  try {
    [classifierResult, sentimentResult] = await Promise.all([
      classifyFakeNews(trimmedText),
      analyzeSentiment(trimmedText),
    ]);
  } catch (err) {
    console.error("[ORCHESTRATOR] Parallel model execution failed:", err);
    classifierResult = { label: "UNKNOWN", confidence: 0, scores: {}, error: err?.message };
    sentimentResult = { sentiment: "Unknown", manipulationLevel: "Unknown", emotionalIntensity: 0, error: err?.message };
    errors.push("Parallel model execution partially failed");
  }

  // Collect individual layer errors
  if (classifierResult?.error) errors.push(`Classifier: ${classifierResult.error}`);
  if (sentimentResult?.error) errors.push(`Sentiment: ${sentimentResult.error}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 2: Run Layer 3 (LLM Reasoning) — SEQUENTIAL
  // This layer needs context from Layer 1 & 2
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let reasoningResult;
  try {
    reasoningResult = await generateReasoning(
      trimmedText,
      classifierResult,
      sentimentResult
    );
  } catch (err) {
    console.error("[ORCHESTRATOR] LLM reasoning failed:", err);
    reasoningResult = {
      explanation: "Reasoning engine could not process this content.",
      verdict: "UNCERTAIN",
      flags: [],
      confidence: 50,
      error: err?.message,
    };
    errors.push(`Reasoning: ${err?.message}`);
  }

  if (reasoningResult?.error) errors.push(`Reasoning: ${reasoningResult.error}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 3: Run Layer 4 (Credibility Engine) — SYNCHRONOUS
  // Aggregates all prior layer outputs
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const finalResult = computeCredibility({
    text: trimmedText,
    classifierResult,
    sentimentResult,
    reasoningResult,
  });

  // Attach error log to final result
  return {
    ...finalResult,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  };
};
