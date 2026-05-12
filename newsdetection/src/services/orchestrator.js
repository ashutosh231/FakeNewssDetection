import { classifyFakeNews } from "./classifier";
import { analyzeSentiment } from "./sentiment";
import { generateReasoning } from "./reasoning";
import { computeCredibility } from "./credibilityEngine";

const URL_REGEX = /https?:\/\/[^\s]+/i;

const extractUrlContent = async (url) => {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TruthScanAI/1.0; +https://truthscan.ai)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    // Extract meta description
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : null;

    // Extract body text (strip HTML tags)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let bodyText = "";
    if (bodyMatch) {
      // Keep only visible text, strip scripts and styles
      const cleaned = bodyMatch[1]
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
        .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
        .replace(/<header[\s\S]*?<\/header>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[^;]+;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      bodyText = cleaned.substring(0, 4000);
    }

    if (!bodyText && !title && !description) return null;

    const extracted = [title, description, bodyText].filter(Boolean).join("\n\n").substring(0, 5000);
    return extracted || null;
  } catch (err) {
    console.warn("[ORCHESTRATOR] URL content extraction failed:", err?.message);
    return null;
  }
};

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

  // Short input handling — classifier models fail on very short text
  const wordCount = trimmedText.split(/\s+/).length;
  if (wordCount < 5) {
    return {
      credibilityScore: wordCount <= 2 ? 50 : 60,
      riskLevel: "MODERATE",
      fakeProbability: wordCount <= 2 ? 50 : 40,
      sentiment: "Neutral",
      manipulationLevel: "Low",
      emotionalIntensity: 10,
      manipulationScore: 0,
      explanation: wordCount <= 2
        ? "Input is too short for meaningful analysis. Please provide a full sentence or article text."
        : "The input is very short, limiting analysis depth. Based on available context, no manipulation or misinformation patterns are detected in this straightforward statement.",
      verdict: "MIXED SIGNALS",
      flags: wordCount <= 2 ? ["Input too short for reliable analysis"] : [],
      sourceSignals: [],
      layerBreakdown: {},
      timestamp: new Date().toISOString(),
    };
  }

  // Auto-detect and extract URL content
  let analysisText = trimmedText;
  if (URL_REGEX.test(trimmedText) && !trimmedText.includes(" ")) {
    const extracted = await extractUrlContent(trimmedText);
    if (extracted) {
      analysisText = extracted;
    }
  }

  let classifierResult, sentimentResult;

  try {
    [classifierResult, sentimentResult] = await Promise.all([
      classifyFakeNews(analysisText),
      analyzeSentiment(analysisText),
    ]);
  } catch (err) {
    console.error("[ORCHESTRATOR] Parallel model execution failed:", err);
    classifierResult = { label: "UNKNOWN", confidence: 0, scores: {}, error: err?.message };
    sentimentResult = { sentiment: "Unknown", manipulationLevel: "Unknown", emotionalIntensity: 0, error: err?.message };
    errors.push("Parallel model execution partially failed");
  }

  if (classifierResult?.error) errors.push(`Classifier: ${classifierResult.error}`);
  if (sentimentResult?.error) errors.push(`Sentiment: ${sentimentResult.error}`);

  let reasoningResult;
  try {
    reasoningResult = await generateReasoning(analysisText, classifierResult, sentimentResult);
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

  const finalResult = computeCredibility({
    text: analysisText,
    classifierResult,
    sentimentResult,
    reasoningResult,
  });

  return {
    ...finalResult,
    retrievedTopics: reasoningResult?._retrievedTopics || [],
    reasoningModel: reasoningResult?._modelSource || (reasoningResult?._fallback ? "Heuristic fallback" : "Unknown"),
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  };
};
