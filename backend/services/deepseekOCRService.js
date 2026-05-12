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

// Primary VL model as requested, with a short chain of multimodal
// fallbacks. All are invoked via the HF Inference API so the same
// token + endpoint style works.
const VL_MODELS = [
  'deepseek-ai/deepseek-vl2',
  'deepseek-ai/deepseek-vl-7b-chat',
  'Salesforce/blip-image-captioning-large',
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
    if (/^[A-Za-z0-9+/=]+$/.test(input) && input.length > 100) {
      return Buffer.from(input, 'base64');
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

// ── Inference call ────────────────────────────────────────────────

const callHFModel = async (model, imageBuffer) => {
  // Strategy: models that accept JSON with { image, text } prompt vs.
  // models that just accept a raw image body. Try JSON multimodal first,
  // then fall back to binary body (for plain caption models like BLIP).

  // Attempt 1: JSON multimodal body
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
        options: { wait_for_model: true },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const data = await res.json();
      const parsed = parseVLResponse(data);
      if (parsed.text || parsed.context) return parsed;
    }
  } catch (err) {
    /* try next shape */
  }

  // Attempt 2: raw image body (captioning models)
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
    if (res.ok) {
      const data = await res.json();
      const parsed = parseVLResponse(data);
      if (parsed.text || parsed.context) return parsed;
    }
  } catch (err) {
    /* swallow */
  }

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

  // ── Model chain ──────────────────────────────────────────────
  let parsed = null;
  let modelUsed = null;
  const errors = [];

  for (const model of VL_MODELS) {
    try {
      const result = await callHFModel(model, buffer);
      if (result && (result.text || result.context)) {
        parsed = result;
        modelUsed = model;
        break;
      }
    } catch (err) {
      errors.push(`${model}: ${err.message}`);
    }
  }

  if (!parsed) {
    const fallback = {
      extractedText: '',
      imageContext: '',
      combinedText: '',
      source: 'deepseek-vl-fallback',
      confidence: 0,
      cached: false,
      error: errors.join(' | ') || 'All VL models unreachable',
    };
    return fallback;
  }

  const extractedText = cleanExtracted(parsed.text);
  const imageContext = (parsed.context || '').trim();
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
