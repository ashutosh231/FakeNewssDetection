import Tesseract from 'tesseract.js';

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * OCR service — DeepSeek-VL primary, Tesseract fallback
 *
 * Public API (unchanged):
 *   extractTextFromImage(imageSource, onProgress)
 *     → { text, confidence, context?, source, raw? }
 *
 * Internal flow:
 *   1. Attempt the backend DeepSeek-VL endpoint which runs OCR +
 *      multimodal context understanding via Hugging Face.
 *   2. If the backend is unreachable, unauthenticated, or returns an
 *      empty payload, fall back to Tesseract so the existing UX is
 *      never broken.
 *
 * The extra fields (`context`, `source`, `raw`) are additive. All
 * existing callers that only read `text` + `confidence` continue to
 * work unchanged.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const API_BASE =
  import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : 'http://localhost:5001/api';

// ── Tesseract (fallback) ─────────────────────────────────────────
const runTesseract = async (imageSource, onProgress) => {
  const result = await Tesseract.recognize(imageSource, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return {
    text: result.data.text,
    confidence: result.data.confidence,
    source: 'tesseract',
  };
};

// ── DeepSeek-VL (primary) ────────────────────────────────────────
const fileToBlob = async (src) => {
  if (src instanceof Blob) return src;
  if (src instanceof File) return src;
  if (typeof src === 'string') {
    // data URL or remote URL -> fetch into a blob
    const res = await fetch(src);
    return await res.blob();
  }
  throw new Error('Unsupported image input for DeepSeek upload');
};

const runDeepSeek = async (imageSource, onProgress) => {
  const form = new FormData();
  const blob = await fileToBlob(imageSource);
  form.append('image', blob, blob.name || 'upload.png');

  // Soft progress while the request is in flight — the backend call is
  // atomic so we can't stream real progress, but we keep the existing
  // loaders lively.
  let pct = 5;
  if (onProgress) onProgress(pct);
  const tick = setInterval(() => {
    pct = Math.min(85, pct + 7);
    if (onProgress) onProgress(pct);
  }, 400);

  try {
    const res = await fetch(`${API_BASE}/scan/image`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    clearInterval(tick);

    if (!res.ok) throw new Error(`DeepSeek OCR HTTP ${res.status}`);

    const payload = await res.json();
    const data = payload?.data || {};

    if (onProgress) onProgress(100);

    // combinedText merges the OCR + multimodal context so the existing
    // fake-news analysis pipeline receives richer grounding with no
    // response-format changes required downstream.
    const text = data.combinedText || data.extractedText || '';
    if (!text.trim()) throw new Error('DeepSeek returned empty text');

    return {
      text,
      confidence: data.confidence ?? 70,
      context: data.imageContext || '',
      source: data.source || 'deepseek-vl',
      raw: data,
    };
  } catch (err) {
    clearInterval(tick);
    throw err;
  }
};

/**
 * Extracts text from an image using DeepSeek-VL with Tesseract fallback.
 *
 * @param {File|Blob|string} imageSource - File, Blob, data URL, or remote URL
 * @param {(pct: number) => void} [onProgress]
 * @returns {Promise<{text: string, confidence: number, context?: string, source: string, raw?: object}>}
 */
export const extractTextFromImage = async (imageSource, onProgress) => {
  // Primary: DeepSeek-VL via backend
  try {
    const result = await runDeepSeek(imageSource, onProgress);
    if (result?.text?.trim()) return result;
  } catch (err) {
    // Swallow and fall back — the UX must not break when the backend
    // is unreachable (e.g. anonymous user, no auth cookie, 401).
    console.warn('[OCR] DeepSeek unavailable, falling back to Tesseract:', err?.message);
  }

  // Fallback: Tesseract (existing behavior)
  try {
    return await runTesseract(imageSource, onProgress);
  } catch (err) {
    console.error('OCR Error:', err);
    throw new Error('Unable to clearly extract text from image. Please upload a clearer screenshot.');
  }
};

/**
 * Lightweight helper for remote image URLs (used by the homepage
 * LiveNews section to enrich article thumbnails silently). Returns the
 * stable DeepSeek-VL payload or null on failure.
 */
export const analyzeImageUrlRemote = async (imageUrl) => {
  if (!imageUrl) return null;
  try {
    const res = await fetch(`${API_BASE}/scan/image/url`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload?.data || null;
  } catch {
    return null;
  }
};
