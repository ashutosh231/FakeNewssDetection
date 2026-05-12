import { HfInference } from "@huggingface/inference";
import { retrieveContext, formatContextForPrompt } from "./retriever";

const hf = new HfInference(import.meta.env.VITE_HF_TOKEN);

const NVIDIA_PROXY_URL = import.meta.env.DEV
  ? "/nvidia-proxy"
  : "/.netlify/functions/nvidia-proxy";

const SYSTEM_PROMPT = `You are VERITAS, a senior AI misinformation analyst analyzing content for credibility.

Rules:
- Use the retrieved fact-check context below to ground your reasoning
- Quote specific words/phrases from the article as evidence
- Note what is MISSING (sources, citations, author, date)
- Identify rhetorical techniques: fear-mongering, false urgency, loaded language, logical fallacies
- Write as a professional fact-checker
- Respond ONLY with a raw JSON object, no markdown or extra text`;

const buildPrompt = (text, classifierResult, sentimentResult, retrievedContext = []) => {
  const classLabel = classifierResult?.label || "N/A";
  const classConf = classifierResult?.confidence || 0;
  const sentLabel = sentimentResult?.sentiment || "N/A";
  const manipLevel = sentimentResult?.manipulationLevel || "N/A";

  const contextBlock = retrievedContext.length > 0
    ? `RETRIEVED FACT-CHECK CONTEXT (use this as grounding):\n${formatContextForPrompt(retrievedContext)}\n\n`
    : "";

  return `${contextBlock}Analyze this content for misinformation. Provide a fact-checker analysis.

CONTENT: "${text.substring(0, 2500)}"

Upstream signals (do NOT mention these directly): classification=${classLabel}(${classConf}%), sentiment=${sentLabel}, manipulation=${manipLevel}

Return ONLY JSON:
{
  "explanation": "<3-5 sentence evidence-based analysis, quote specific phrases, note missing sources, identify manipulation techniques>",
  "verdict": "<VERIFIED or MIXED SIGNALS or SUSPICIOUS or HIGHLY SUSPICIOUS>",
  "flags": ["<evidence-based flags>"],
  "confidence": <0-100>
}`;
};

const parseResponse = (textResponse) => {
  if (!textResponse) throw new Error("Empty response");
  const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) textResponse = jsonMatch[0];
  const parsed = JSON.parse(textResponse);
  return {
    explanation: parsed?.explanation || "No explanation generated.",
    verdict: parsed?.verdict || "UNCERTAIN",
    flags: Array.isArray(parsed?.flags) ? parsed.flags : [],
    confidence: typeof parsed?.confidence === "number" ? parsed.confidence : 50,
  };
};

const callHFTextGen = async (prompt, model) => {
  const response = await hf.textGeneration({
    model,
    inputs: `${SYSTEM_PROMPT}\n\n${prompt}`,
    parameters: {
      max_new_tokens: 600,
      temperature: 0.1,
      return_full_text: false,
    },
  });
  return response?.generated_text;
};

const callNVIDIA = async (prompt) => {
  const headers = { "Content-Type": "application/json" };
  if (import.meta.env.DEV) {
    headers["Authorization"] = `Bearer ${import.meta.env.VITE_NVIDIA_API_KEY}`;
  }
  const response = await fetch(NVIDIA_PROXY_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "meta/llama-3.1-70b-instruct",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 600,
      temperature: 0.1,
    }),
  });
  const data = await response.json();
  return data?.choices?.[0]?.message?.content;
};

const generateFallbackExplanation = (text, classifierResult, sentimentResult) => {
  const classLabel = classifierResult?.label || "Unknown";
  const manipLevel = sentimentResult?.manipulationLevel || "Unknown";
  const textLower = text.toLowerCase();

  const flags = [];
  let explanation = "";

  if (text.length < 20) {
    flags.push("Very short input — insufficient context for deep analysis");
  }

  const hasSource = /according to|cited|published|https?:\/\//i.test(text);
  if (!hasSource) flags.push("No verifiable sources cited");

  const hasEmotional = /!!!|\?{2,}|shocking|unbelievable|urgent/i.test(text);
  if (hasEmotional) flags.push("Uses emotional manipulation language");

  if (classLabel === "FAKE") {
    flags.push("Identified as potential misinformation by classifier");
    explanation = "The content exhibits patterns commonly associated with misinformation, including unsubstantiated claims and lack of verifiable sources. No credible citations or data are provided to support the claims made.";
  } else if (classLabel === "REAL") {
    explanation = "The content appears to be a straightforward factual statement. No obvious manipulation techniques or misleading patterns were detected in the text structure or language.";
  } else {
    explanation = "Analysis based on available signals. The content is short and lacks sufficient context for a deep fact-checking assessment.";
  }

  if (flags.length === 0) {
    flags.push("No specific flags detected");
  }

  let verdict = "MIXED SIGNALS";
  if (classLabel === "FAKE" && manipLevel === "High") verdict = "HIGHLY SUSPICIOUS";
  else if (classLabel === "FAKE") verdict = "SUSPICIOUS";
  else if (classLabel === "REAL" && manipLevel === "Low") verdict = "VERIFIED";

  const confidence = classLabel === "REAL" && manipLevel === "Low" ? 85
    : classLabel === "FAKE" ? 20
    : 50;

  return { explanation, verdict, flags, confidence };
};

const ATTEMPTS = [
  { name: "HF Zephyr-7B", fn: (p) => callHFTextGen(p, "HuggingFaceH4/zephyr-7b-beta") },
  { name: "HF Mistral-7B", fn: (p) => callHFTextGen(p, "mistralai/Mistral-7B-Instruct-v0.1") },
  { name: "NVIDIA Llama-3.1-70B", fn: (p) => callNVIDIA(p) },
];

export const generateReasoning = async (text, classifierResult = {}, sentimentResult = {}) => {
  const retrievedContext = retrieveContext(text, 3);
  const prompt = buildPrompt(text, classifierResult, sentimentResult, retrievedContext);
  const errors = [];

  for (const attempt of ATTEMPTS) {
    try {
      const textResponse = await attempt.fn(prompt);
      const parsed = parseResponse(textResponse);
      if (parsed.explanation && parsed.explanation.length > 10) {
        return {
          ...parsed,
          _modelSource: attempt.name,
          _retrievedTopics: retrievedContext.map((c) => c.topic),
        };
      }
    } catch (err) {
      errors.push(`${attempt.name}: ${err?.message}`);
    }
  }

  console.warn("[REASONING] All models failed, using fallback:", errors);
  return {
    ...generateFallbackExplanation(text, classifierResult, sentimentResult),
    _fallback: true,
    _errors: errors,
    _retrievedTopics: retrievedContext.map((c) => c.topic),
  };
};
