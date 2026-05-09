/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * HUGGING FACE SERVICE — Public API Facade
 * 
 * This module is the public interface consumed by UI components.
 * It delegates to the multi-model orchestrator pipeline and
 * formats the structured result into HTML for the brutalist chat UI.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { runAnalysisPipeline } from "./orchestrator";

/**
 * Analyzes news content through the full multi-model AI pipeline
 * and returns an HTML-formatted string for the chat interface.
 *
 * @param {string} text - User input text
 * @returns {Promise<{html: string, raw: object}>} HTML-formatted analysis result and raw data
 */
export const analyzeNews = async (text) => {
  try {
    const result = await runAnalysisPipeline(text);

    // Determine color classes based on risk level
    let riskColor = "text-yellow-600 bg-yellow-100";
    let riskBorder = "border-yellow-400";
    const risk = result?.riskLevel?.toUpperCase() || "UNKNOWN";
    if (risk === "HIGH RISK") {
      riskColor = "text-red-600 bg-red-100";
      riskBorder = "border-red-400";
    } else if (risk === "SUSPICIOUS") {
      riskColor = "text-orange-600 bg-orange-100";
      riskBorder = "border-orange-400";
    } else if (risk === "SAFE") {
      riskColor = "text-green-600 bg-green-100";
      riskBorder = "border-green-400";
    }

    // Fake probability badge color
    let fakeColor = "text-green-600";
    if (result.fakeProbability >= 70) fakeColor = "text-red-500";
    else if (result.fakeProbability >= 40) fakeColor = "text-yellow-500";

    // Manipulation badge color
    let manipColor = "text-green-600";
    const manipLevel = result?.manipulationLevel?.toLowerCase() || "";
    if (manipLevel === "high") manipColor = "text-red-500";
    else if (manipLevel === "moderate" || manipLevel === "low-moderate") manipColor = "text-yellow-500";

    // Build flags HTML
    const flagsHtml =
      result?.flags?.length > 0
        ? result.flags
            .map(
              (f) =>
                `<span class="inline-block text-[10px] font-mono px-2 py-0.5 bg-red-100 text-red-600 border border-red-300 rounded mr-1 mb-1">${f}</span>`
            )
            .join("")
        : `<span class="text-[10px] font-mono text-green-600">None detected</span>`;

    // Build layer breakdown HTML (no indentation — whitespace-pre-wrap will render it)
    const lb = result?.layerBreakdown || {};
    const breakdownHtml = `<div class="grid grid-cols-2 gap-1 mt-1"><div class="text-[10px] font-mono"><span class="opacity-60">CLASSIFIER:</span> <span class="font-bold">${lb?.classifier?.score ?? "—"}/100</span> <span class="opacity-40">(${Math.round((lb?.classifier?.weight || 0) * 100)}%)</span></div><div class="text-[10px] font-mono"><span class="opacity-60">SENTIMENT:</span> <span class="font-bold">${lb?.sentiment?.score ?? "—"}/100</span> <span class="opacity-40">(${Math.round((lb?.sentiment?.weight || 0) * 100)}%)</span></div><div class="text-[10px] font-mono"><span class="opacity-60">REASONING:</span> <span class="font-bold">${lb?.reasoning?.score ?? "—"}/100</span> <span class="opacity-40">(${Math.round((lb?.reasoning?.weight || 0) * 100)}%)</span></div><div class="text-[10px] font-mono"><span class="opacity-60">SOURCE:</span> <span class="font-bold">${lb?.source?.score ?? "—"}/100</span> <span class="opacity-40">(${Math.round((lb?.source?.weight || 0) * 100)}%)</span></div></div>`;

    // IMPORTANT: No indentation inside template — the chat UI uses whitespace-pre-wrap
    // so every space and newline becomes visible. Keep HTML on single lines.
    const html = `[MULTI-MODEL ANALYSIS COMPLETE]

TARGET: "${text.length > 120 ? text.substring(0, 120) + "..." : text}"
CREDIBILITY SCORE: <span class="text-2xl">${result.credibilityScore}%</span>
<div class="mt-3 mb-2 p-3 border-2 border-[#09090B] bg-white rounded-xl hard-shadow-sm"><div class="flex items-center gap-2 mb-2"><div class="text-[10px] font-mono text-[#09090B]/60">RISK LEVEL:</div><div class="font-bold uppercase tracking-wider px-2 py-0.5 inline-block border border-[#09090B] ${riskColor} text-xs">${result.riskLevel}</div></div><div class="border-t border-[#09090B]/10 pt-2 mb-2"><div class="text-[10px] font-mono mb-0.5 text-[#09090B]/60">VERDICT:</div><div class="text-sm font-bold uppercase">${result.verdict}</div></div><div class="border-t border-[#09090B]/10 pt-2 mb-2"><div class="flex items-center gap-4"><div><div class="text-[10px] font-mono text-[#09090B]/60">FAKE PROBABILITY</div><div class="text-lg font-bold ${fakeColor}">${result.fakeProbability}%</div></div><div><div class="text-[10px] font-mono text-[#09090B]/60">SENTIMENT</div><div class="text-xs font-bold uppercase">${result.sentiment}</div></div><div><div class="text-[10px] font-mono text-[#09090B]/60">MANIPULATION</div><div class="text-xs font-bold uppercase ${manipColor}">${result.manipulationLevel}</div></div></div></div><div class="border-t border-[#09090B]/10 pt-2 mb-2"><div class="text-[10px] font-mono mb-0.5 text-[#09090B]/60">AI EXPLANATION:</div><div class="text-sm font-medium leading-snug">${result.explanation}</div></div><div class="border-t border-[#09090B]/10 pt-2 mb-2"><div class="text-[10px] font-mono mb-0.5 text-[#09090B]/60">DETECTED FLAGS:</div><div class="flex flex-wrap gap-1">${flagsHtml}</div></div><div class="border-t border-[#09090B]/10 pt-2"><div class="text-[10px] font-mono mb-0.5 text-[#09090B]/60">LAYER BREAKDOWN:</div>${breakdownHtml}</div></div>`;
    return { html, raw: result };
  } catch (err) {
    console.error("AI Pipeline Error:", err);
    return { 
      html: `⚠️ [ERROR] VERITAS AI multi-model pipeline encountered a fault: ${err?.message || "Unknown error"}`,
      raw: null 
    };
  }
};

/**
 * Runs the full pipeline and returns the raw structured object.
 * Used by ScanContent and other components that render their own UI.
 *
 * @param {string} text - User input text
 * @returns {Promise<object>} Raw analysis result object
 */
export const analyzeNewsRaw = async (text) => {
  try {
    return await runAnalysisPipeline(text);
  } catch (err) {
    console.error("AI Pipeline Error:", err);
    return {
      credibilityScore: 0,
      riskLevel: "HIGH RISK",
      fakeProbability: 0,
      sentiment: "Unknown",
      manipulationLevel: "Unknown",
      emotionalIntensity: 0,
      explanation: `Analysis pipeline failed: ${err?.message || "Unknown error"}`,
      verdict: "ERROR",
      flags: ["Pipeline Error"],
      sourceSignals: [],
      layerBreakdown: {},
    };
  }
};
