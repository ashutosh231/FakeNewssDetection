/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DeepSeek-VL OCR + Multimodal Image Analysis Service
 *
 * Thin, reusable wrapper around the Hugging Face Inference API for
 * the `deepseek-ai/deepseek-vl2` multimodal model.
 *
 * Responsibilities:
 *   1. OCR — extract visible text from an image (meme, screenshot,
 *      news headline, social media post).
 *   2. Contextual understanding — describe *what the image actually
 *      shows* so downstream credibility analysis has richer grounding.
 *   3. Redis caching keyed by SHA-256 of the image payload to avoid
 *      re-paying for repeat scans of the same image.
 *   4. Graceful fallback — never throw, always return a useful shape
 *      so the existing pipeline keeps its response format intact.
 *
 * Return shape (stable contract):
 *   {
 *     extractedText: string,       // cleaned OCR text
 *     imageContext:  string,       // short description of what the image shows
 *     combinedText:  string,       // text that can be fed into the
 *                                  // existing fake-news pipeline unchanged
 *     source:        'deepseek-vl' | 'deepseek-vl-fallback',
 *     confidence:    number,       // 0-100 heuristic
 *     cached:        boolean,
 *     error?:        string
 *   }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const crypto = require('crypto');
const fs = require('fs');
const { redisClient } = require('../config/redis');

const HF_TOKEN = process.env.HF_TOKEN || process.env.VITE_HF_TOKEN;

// Model chain for multimodal OCR + image understanding via HF Inference API.
// DeepSeek-VL2 is the ideal model but is gated/unavailable on the free
// Inference API tier. We use a practical chain of models that ARE available:
//
// 1. microsoft/trocr-large-printed — dedicated OCR model (best for text extraction)
// 2. Salesforce/blip-image-captioning-large — image captioning (context)
// 3. nlpconnect/vit-gpt2-image-captioning — lightweight fallback captioning
//
// The service combines OCR output + captioning to produce both extracted
// text AND contextual understanding of the image.

const OCR_MODELS = [
  'microsoft/trocr-large-printed',
  'microsoft/trocr-base-printed',
];

const CAPTION_MODELS = [
  'Salesforce/blip-image-captioning-large',
  'Salesforce/blip-image-captioning-base',
  'nlpconnect/vit-gpt2-image-captioning',
];

// Document understanding models that can extract structured text from
// full-page screenshots (not just single lines like TrOCR).
const DOCUMENT_MODELS = [
  'microsoft/Florence-2-large',
  'naver-clova-ix/donut-base-finetuned-cord-v2',
];

const HF_BASE = 'https://api-inference.huggingface.co/models';

const CACHE_PREFIX = 'cache:deepseek-ocr:';
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days — image content is deterministic

// ── Helpers ───────────────────────────────────────────────────────

const hashBuffer = (buffer) =>
  crypto.createHash('sha256').update(buffer).digest('hex');

const toBuffer = async (input) => {
  if (!input) throw new Error('No image input provided');
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);
  if (typeof input === 'string') {
    // data URL, raw base64, or filesystem path
    if (input.startsWith('data:')) {
      const comma = input.indexOf(',');
      return Buffer.from(input.slice(comma + 1), 'base64');
    }
    // Check if it looks like base64 (at least 20 chars, valid charset)
    if (/^[A-Za-z0-9+/\n\r]+=*$/.test(input.replace(/\s/g, '')) && input.length > 20) {
      return Buffer.from(input.replace(/\s/g, ''), 'base64');
    }
    if (fs.existsSync(input)) {
      return fs.readFileSync(input);
    }
  }
  throw new Error('Unsupported image input type');
};

const cleanExtracted = (raw) =>
  (raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim();

const buildPrompt = () =>
  'You are an OCR and image-understanding assistant. Given this image:\n' +
  '1. Extract ALL visible text verbatim.\n' +
  '2. Describe what the image shows (screenshot, meme, news post, social media post, etc.) and any visual cues.\n' +
  'Respond in this exact JSON shape: {"text":"<extracted text>","context":"<image description>"}';

const parseVLResponse = (raw) => {
  if (!raw) return { text: '', context: '' };

  // Unify possible HF response shapes
  let textBlob = '';
  if (typeof raw === 'string') textBlob = raw;
  else if (Array.isArray(raw)) {
    textBlob = raw
      .map((r) => r?.generated_text || r?.text || r?.caption || '')
      .join('\n');
  } else if (raw?.generated_text) {
    textBlob = raw.generated_text;
  } else if (raw?.text) {
    textBlob = raw.text;
  } else if (raw?.choices?.[0]?.message?.content) {
    textBlob = raw.choices[0].message.content;
  } else {
    textBlob = JSON.stringify(raw);
  }

  // Try to pull JSON out of the model response
  const jsonMatch = textBlob.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        text: cleanExtracted(parsed.text || parsed.extracted || ''),
        context: (parsed.context || parsed.description || '').trim(),
      };
    } catch {
      /* fall through */
    }
  }

  // No JSON — treat whole blob as extracted text
  return { text: cleanExtracted(textBlob), context: '' };
};

// ── Inference calls ───────────────────────────────────────────────

/**
 * Call an OCR model (TrOCR) — accepts raw image bytes, returns text.
 */
const callOCRModel = async (model, imageBuffer) => {
  try {
    const res = await fetch(`${HF_BASE}/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/octet-stream',
        Accept: 'application/json',
      },
      body: imageBuffer,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // TrOCR returns [{ generated_text: "..." }]
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text;
    }
    if (data?.generated_text) return data.generated_text;
    if (typeof data === 'string') return data;
    return null;
  } catch {
    return null;
  }
};

/**
 * Call a captioning model (BLIP/ViT-GPT2) — accepts raw image bytes,
 * returns a short description of what the image shows.
 */
const callCaptionModel = async (model, imageBuffer) => {
  try {
    const res = await fetch(`${HF_BASE}/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/octet-stream',
        Accept: 'application/json',
      },
      body: imageBuffer,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // BLIP returns [{ generated_text: "..." }]
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text;
    }
    if (data?.generated_text) return data.generated_text;
    if (typeof data === 'string') return data;
    return null;
  } catch {
    return null;
  }
};

/**
 * Try the DeepSeek-VL chat-style API as a bonus attempt (if the model
 * becomes available in the future). This is a best-effort call.
 */
const callDeepSeekVL = async (imageBuffer) => {
  const model = 'deepseek-ai/deepseek-vl2';
  try {
    const res = await fetch(`${HF_BASE}/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          image: imageBuffer.toString('base64'),
          text: buildPrompt(),
        },
        parameters: { max_new_tokens: 512, temperature: 0.1 },
        options: { wait_for_model: false },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = parseVLResponse(data);
    if (parsed.text || parsed.context) return parsed;
    return null;
  } catch {
    return null;
  }
};

/**
 * Call a document understanding model (Florence-2, Donut) that can
 * handle full-page screenshots with multiple lines of text.
 */
const callDocumentModel = async (model, imageBuffer) => {
  // Florence-2 uses a JSON body with task prompt
  try {
    const res = await fetch(`${HF_BASE}/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        inputs: imageBuffer.toString('base64'),
        parameters: { task_prompt: '<OCR>' },
        options: { wait_for_model: true },
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (res.ok) {
      const data = await res.json();
      // Florence-2 returns { generated_text: "..." } or [{ generated_text }]
      let text = '';
      if (Array.isArray(data) && data[0]?.generated_text) text = data[0].generated_text;
      else if (data?.generated_text) text = data.generated_text;
      else if (data?.[0]?.['<OCR>']) text = data[0]['<OCR>'];
      if (text && text.trim().length > 5) return text.trim();
    }
  } catch { /* try raw body */ }

  // Fallback: raw image body (Donut-style)
  try {
    const res = await fetch(`${HF_BASE}/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/octet-stream',
        Accept: 'application/json',
      },
      body: imageBuffer,
      signal: AbortSignal.timeout(45000),
    });
    if (res.ok) {
      const data = await res.json();
      let text = '';
      if (Array.isArray(data) && data[0]?.generated_text) text = data[0].generated_text;
      else if (data?.generated_text) text = data.generated_text;
      if (text && text.trim().length > 5) return text.trim();
    }
  } catch { /* swallow */ }

  return null;
};

// ── Public API ────────────────────────────────────────────────────

/**
 * Run DeepSeek-VL OCR + context understanding on an image.
 *
 * @param {Buffer|string} imageInput - image buffer, base64 string, data URL, or filesystem path
 * @param {object} [opts]
 * @param {boolean} [opts.useCache=true]
 * @returns {Promise<object>} stable result shape (see file header)
 */
const analyzeImage = async (imageInput, opts = {}) => {
  const { useCache = true } = opts;

  let buffer;
  try {
    buffer = await toBuffer(imageInput);
  } catch (err) {
    return {
      extractedText: '',
      imageContext: '',
      combinedText: '',
      source: 'deepseek-vl-fallback',
      confidence: 0,
      cached: false,
      error: err.message,
    };
  }

  const hash = hashBuffer(buffer);
  const cacheKey = `${CACHE_PREFIX}${hash}`;

  // ── Cache lookup ─────────────────────────────────────────────
  if (useCache && redisClient?.isOpen) {
    try {
      const hit = await redisClient.get(cacheKey);
      if (hit) {
        return { ...JSON.parse(hit), cached: true };
      }
    } catch (err) {
      console.warn('[deepseekOCR] cache read failed:', err.message);
    }
  }

  if (!HF_TOKEN) {
    return {
      extractedText: '',
      imageContext: '',
      combinedText: '',
      source: 'deepseek-vl-fallback',
      confidence: 0,
      cached: false,
      error: 'HF_TOKEN not configured on server',
    };
  }

  // ── Model chain (dual: OCR + captioning) ──────────────────────
  let extractedText = '';
  let imageContext = '';
  let modelUsed = null;
  const errors = [];

  // Step 1: Try DeepSeek-VL first (best-effort, may not be available)
  const deepseekResult = await callDeepSeekVL(buffer);
  if (deepseekResult && (deepseekResult.text || deepseekResult.context)) {
    extractedText = cleanExtracted(deepseekResult.text);
    imageContext = (deepseekResult.context || '').trim();
    modelUsed = 'deepseek-ai/deepseek-vl2';
  }

  // Step 2: If DeepSeek didn't produce OCR text, try document models
  // (these handle full-page screenshots with multiple lines)
  if (!extractedText) {
    for (const model of DOCUMENT_MODELS) {
      try {
        const docText = await callDocumentModel(model, buffer);
        if (docText && docText.trim().length > 10) {
          extractedText = cleanExtracted(docText);
          modelUsed = model;
          break;
        }
      } catch (err) {
        errors.push(`${model}: ${err.message}`);
      }
    }
  }

  // Step 3: If document models failed, try single-line OCR models
  if (!extractedText) {
    for (const model of OCR_MODELS) {
      try {
        const ocrText = await callOCRModel(model, buffer);
        if (ocrText && ocrText.trim().length > 3) {
          extractedText = cleanExtracted(ocrText);
          modelUsed = model;
          break;
        }
      } catch (err) {
        errors.push(`${model}: ${err.message}`);
      }
    }
  }

  // Step 4: Get image context/caption (always try, enriches the pipeline)
  if (!imageContext) {
    for (const model of CAPTION_MODELS) {
      try {
        const caption = await callCaptionModel(model, buffer);
        if (caption && caption.trim().length > 5) {
          imageContext = caption.trim();
          if (!modelUsed) modelUsed = model;
          break;
        }
      } catch (err) {
        errors.push(`${model}: ${err.message}`);
      }
    }
  }

  // If we got nothing at all, return fallback
  if (!extractedText && !imageContext) {
    return {
      extractedText: '',
      imageContext: '',
      combinedText: '',
      source: 'deepseek-vl-fallback',
      confidence: 0,
      cached: false,
      error: errors.join(' | ') || 'All models returned empty results',
    };
  }
  const combinedText = [
    imageContext ? `[Image context: ${imageContext}]` : '',
    extractedText,
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();

  // Rough heuristic confidence
  const confidence = Math.min(
    100,
    Math.round((extractedText.length > 20 ? 60 : 20) + (imageContext ? 30 : 0))
  );

  const payload = {
    extractedText,
    imageContext,
    combinedText,
    source: 'deepseek-vl',
    model: modelUsed,
    confidence,
    cached: false,
  };

  // ── Cache write ──────────────────────────────────────────────
  if (useCache && redisClient?.isOpen) {
    try {
      await redisClient.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(payload));
    } catch (err) {
      console.warn('[deepseekOCR] cache write failed:', err.message);
    }
  }

  return payload;
};

/**
 * Analyze a remote image URL (used by homepage LiveNews article thumbnails).
 * Fetches the image server-side, then defers to analyzeImage().
 */
const analyzeImageUrl = async (url, opts = {}) => {
  if (!url || typeof url !== 'string') {
    return {
      extractedText: '',
      imageContext: '',
      combinedText: '',
      source: 'deepseek-vl-fallback',
      confidence: 0,
      cached: false,
      error: 'No URL provided',
    };
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    return analyzeImage(Buffer.from(arrayBuf), opts);
  } catch (err) {
    return {
      extractedText: '',
      imageContext: '',
      combinedText: '',
      source: 'deepseek-vl-fallback',
      confidence: 0,
      cached: false,
      error: err.message,
    };
  }
};

module.exports = {
  analyzeImage,
  analyzeImageUrl,
  _internal: { hashBuffer, cleanExtracted, parseVLResponse },
};
