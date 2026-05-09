/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * LAYER 3 — LLM REASONING ENGINE
 * Model: meta-llama/Meta-Llama-3-8B-Instruct
 * Purpose: Human-readable analysis & explanation generation
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { HfInference } from "@huggingface/inference";

const hf = new HfInference(import.meta.env.VITE_HF_TOKEN);

const SYSTEM_PROMPT = `You are VERITAS, a senior AI misinformation analyst. Your job is to examine content and explain exactly WHY it is or is not credible — citing specific evidence from the text itself.

STRICT RULES:
- NEVER say "the prior model said" or "the classifier output indicates" or "the sentiment analysis suggests". Those are internal signals for your reference only. The user does not know about them.
- ALWAYS quote specific words, phrases, or patterns from the content as evidence.
- ALWAYS mention what is MISSING (sources, citations, author, date, verifiable data) if applicable.
- Identify specific rhetorical techniques: fear-mongering, appeal to emotion, false urgency, clickbait, loaded language, logical fallacies, unsupported generalizations.
- If a URL or source is mentioned, comment on its reliability.
- Write as a professional fact-checker presenting findings to a reader.
- You MUST respond ONLY with a raw JSON object. No markdown, no backticks, no extra text.`;

/**
 * Uses an LLM to generate detailed reasoning about content credibility.
 * Receives context from prior model layers to produce an informed analysis.
 *
 * @param {string} text - Original user input
 * @param {object} classifierResult - Output from Layer 1 (classifier)
 * @param {object} sentimentResult - Output from Layer 2 (sentiment)
 * @returns {Promise<{ explanation: string, verdict: string, flags: string[], confidence: number }>}
 */
export const generateReasoning = async (
  text,
  classifierResult = {},
  sentimentResult = {}
) => {
  try {
    // Build internal context string — the LLM uses these as background signals,
    // but the prompt forbids it from mentioning them directly.
    const classLabel = classifierResult?.label || "N/A";
    const classConf = classifierResult?.confidence || 0;
    const sentLabel = sentimentResult?.sentiment || "N/A";
    const manipLevel = sentimentResult?.manipulationLevel || "N/A";
    const emoIntensity = sentimentResult?.emotionalIntensity || 0;
    const negScore = sentimentResult?.negativeScore || 0;

    const prompt = `Analyze this content and explain whether it is credible or misleading. Provide a fact-checker-style explanation with SPECIFIC EVIDENCE from the text.

CONTENT:
"${text.substring(0, 3000)}"

INTERNAL BACKGROUND SIGNALS (for your reference only — do NOT mention these models or their outputs in your explanation):
- Classification signal: ${classLabel} (${classConf}% confidence)
- Emotional tone: ${sentLabel}, manipulation=${manipLevel}, intensity=${emoIntensity}%, negative=${negScore}%

YOUR TASK:
1. Read the content carefully
2. Identify specific problematic phrases, missing evidence, or credibility indicators
3. Quote exact words/phrases from the content as evidence
4. Note what verifiable sources, data, or citations are present or absent
5. Detect any rhetorical manipulation techniques (fear-mongering, urgency, loaded language, clickbait, logical fallacies)
6. Assess if the claim can be independently verified

Return ONLY a raw JSON object:
{
  "explanation": "<4-5 sentences of evidence-based analysis. Quote specific phrases from the content. Mention what sources/evidence are missing. Identify specific manipulation techniques if found. Write like a professional fact-checker — not a model output summary.>",
  "verdict": "<one of: VERIFIED, MIXED SIGNALS, SUSPICIOUS, HIGHLY SUSPICIOUS>",
  "flags": ["<1-4 specific evidence-based flags like 'No verifiable sources cited', 'Uses fear-based language: [quote]', 'Unsubstantiated statistical claim', 'Clickbait headline pattern', 'No author or publication date'>"],
  "confidence": <number 0-100>
}`;

    const response = await hf.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.2,
    });

    let textResponse = response?.choices?.[0]?.message?.content;

    if (!textResponse) {
      throw new Error("Empty LLM response.");
    }

    // Extract JSON from potential markdown wrapping
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) textResponse = jsonMatch[0];

    const parsed = JSON.parse(textResponse);

    return {
      explanation:
        parsed?.explanation || "Analysis could not generate explanation.",
      verdict: parsed?.verdict || "UNCERTAIN",
      flags: Array.isArray(parsed?.flags) ? parsed.flags : [],
      confidence: typeof parsed?.confidence === "number" ? parsed.confidence : 50,
      raw: parsed,
    };
  } catch (err) {
    console.error("[REASONING] LLM reasoning failed:", err);
    return {
      explanation:
        "The reasoning engine encountered an error and could not generate a detailed explanation. The credibility score is based on the classifier and sentiment models only.",
      verdict: "UNCERTAIN",
      flags: ["Reasoning Engine Error"],
      confidence: 50,
      raw: null,
      error: err?.message || "LLM reasoning unavailable",
    };
  }
};
