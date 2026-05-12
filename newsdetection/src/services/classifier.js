import { HfInference } from "@huggingface/inference";

const hf = new HfInference(import.meta.env.VITE_HF_TOKEN);

const MODELS = [
  "hamzab/roberta-fake-news-classification",
  "mrm8488/bert-tiny-finetuned-fake-news-detection",
];

const normalizeLabel = (label) => {
  const upper = (label || "").toUpperCase();
  if (upper === "LABEL_0") return "REAL";
  if (upper === "LABEL_1") return "FAKE";
  if (upper === "FAKE" || upper === "FAKE NEWS") return "FAKE";
  if (upper === "REAL" || upper === "TRUE" || upper === "VERIFIED") return "REAL";
  return upper;
};

export const classifyFakeNews = async (text) => {
  const results = [];
  const errors = [];

  for (const model of MODELS) {
    try {
      const truncated = text.substring(0, 2000);
      const result = await hf.textClassification({ model, inputs: truncated });
      if (!result || !Array.isArray(result) || result.length === 0) continue;

      const topResult = result[0];
      const scores = {};
      result.forEach((r) => {
        scores[normalizeLabel(r.label)] = Math.round((r.score || 0) * 100);
      });

      const label = normalizeLabel(topResult.label);
      const confidence = Math.round((topResult.score || 0) * 100);

      results.push({ label, confidence, scores, model });
    } catch (err) {
      errors.push(`${model}: ${err?.message}`);
    }
  }

  if (results.length === 0) {
    return {
      label: "UNKNOWN",
      confidence: 0,
      scores: {},
      modelsTried: MODELS,
      errors,
    };
  }

  const labelVotes = {};
  results.forEach((r) => {
    labelVotes[r.label] = (labelVotes[r.label] || 0) + 1;
  });

  const fakeScores = results.map(r =>
    r.label === "FAKE" ? r.confidence : 100 - r.confidence
  );
  const avgFake = Math.round(fakeScores.reduce((a, b) => a + b, 0) / fakeScores.length);

  const realScores = results.map(r =>
    r.label === "REAL" ? r.confidence : 100 - r.confidence
  );
  const avgReal = Math.round(realScores.reduce((a, b) => a + b, 0) / realScores.length);

  const finalLabel = avgFake > avgReal ? "FAKE" : "REAL";
  const finalConfidence = finalLabel === "FAKE" ? avgFake : avgReal;

  const allScores = {};
  results.forEach((r) => {
    Object.entries(r.scores).forEach(([k, v]) => {
      allScores[k] = (allScores[k] || 0) + v;
    });
  });
  Object.keys(allScores).forEach((k) => {
    allScores[k] = Math.round(allScores[k] / results.length);
  });

  return {
    label: finalLabel,
    confidence: finalConfidence,
    scores: allScores,
    modelsUsed: results.length,
    modelsTried: MODELS,
    errors: errors.length > 0 ? errors : undefined,
  };
};
