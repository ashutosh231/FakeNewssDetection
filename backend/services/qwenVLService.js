/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Qwen2.5-VL Multimodal OCR + Image Understanding Service
 *
 * Primary multimodal engine for the TruthScan AI fake news detection
 * pipeline. Uses Hugging Face Inference API with Qwen/Qwen2.5-VL
 * models for:
 *   1. OCR — extract ALL visible text from images (screenshots, memes,
 *      news posts, social media, documents, multilingual content).
 *   2. Contextual understanding — describe what the image shows,
 *      detect manipulation cues, sensational framing, and suspicious
 *      visual patterns.
 *   3. Fake/misleading content signals — flag visual indicators of
 *      misinformation (doctored images, clickbait layouts, etc.).
 *
 * Architecture:
 *   - Qwen2.5-VL-7B-Instruct (primary) → Qwen2.5-VL-3B-Instruct (fallback)
 *   - Redis/Valkey caching keyed by SHA-256 of image payload
 *   - Graceful degradation to legacy DeepSeek/BLIP/TrOCR chain
 *   - Modular design for future model integrations
 *
 * Return shape (stable contract — identical to deepseekOCRService):
 *   {
 *     extractedText: string,       // cleaned OCR text
 *     imageContext:  string,       // description + manipulation signals
 *     combinedText:  string,       // merged text for pipeline input
 *     source:        'qwen-vl' | 'qwen-vl-fallback' | 'legacy-fallback',
 *     model:         string,       // which model produced the result
 *     confidence:    number,       // 0-100 heuristic
 *     cached:        boolean,
 *     multilingual:  boolean,      // whether non-Latin text was detected
 *     error?:        string
 *   }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const crypto = require('crypto');
const fs = require('fs');
const { redisClient } = require('../config/redis');

const HF_TOKEN = process.env.HF_TOKEN || process.env.VITE_HF_TOKEN;

// ── Model Configuration ──────────────────────────────────────────
// Qwen2.5-VL models + other VLMs available on HF Inference API.
// The router tries each in order; first successful response wins.
// GLM-4.5V is confirmed working on the free tier as a VLM.
const QWEN_VL_MODELS = [
  'Qwen/Qwen2.5-VL-7B-Instruct',
  'Qwen/Qwen2.5-VL-3B-Instruct',
  'zai-org/GLM-4.5V',
  'Qwen/Qwen2-VL-7B-Instruct',
];

// Legacy fallback models (from deepseekOCRService) for graceful degradation
const LEGACY_CAPTION_MODELS = [
  'Salesforce/blip-image-captioning-large',
  'Salesforce/blip-image-captioning-base',
];

const LEGACY_OCR_MODELS = [
  'microsoft/trocr-large-printed',
  'microsoft/trocr-base-printed',
];

const HF_INFERENCE_BASE = 'https://api-inference.huggingface.co/models';
const HF_CHAT_BASE = 'https://api-inference.huggingface.co/models';

const CACHE_PREFIX = 'cache:qwen-vl:';
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// ── Helpers ──────────────────────────────────────────────────────

const hashBuffer = (buffer) =>
  crypto.createHash('sha256').update(buffer).digest('hex');

const toBuffer = async (input) => {
  if (!input) throw new Error('No image input provided');
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);
  if (typeof input === 'string') {
    if (input.startsWith('data:')) {
      const comma = input.indexOf(',');
      return Buffer.from(input.slice(comma + 1), 'base64');
    }
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
    .trim();

const detectMultilingual = (text) => {
  if (!text) return false;
  // Check for non-Latin scripts (CJK, Arabic, Devanagari, Cyrillic, etc.)
  return /[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u3000-\u9FFF\uAC00-\uD7AF]/.test(text);
};

// ── Qwen2.5-VL System Prompt ─────────────────────────────────────
const SYSTEM_PROMPT = `You are a multimodal OCR and image analysis assistant for a fake news detection system. Your task is to:

1. EXTRACT all visible text from the image exactly as it appears (preserve formatting, line breaks, and multilingual content).
2. DESCRIBE what the image shows — type (screenshot, meme, news article, social media post, infographic, document, etc.), visual layout, and any notable elements.
3. ANALYZE for misinformation signals — look for sensational headlines, manipulated imagery, clickbait patterns, missing attribution, doctored elements, or suspicious visual cues.

Respond ONLY with a valid JSON object in this exact format:
{
  "text": "<all extracted text verbatim, preserve line breaks as \\n>",
  "context": "<concise description of what the image shows and its type>",
  "signals": "<any misinformation/manipulation signals detected, or 'none detected'>"
}`;

const USER_PROMPT = 'Analyze this image. Extract all text, describe what it shows, and flag any misinformation signals.';

// ── Qwen2.5-VL Inference ─────────────────────────────────────────

/**
 * Call Qwen2.5-VL via HF Inference API using the chat completions format.
 * Qwen-VL models accept images as base64 data URLs in the message content.
 */
const callQwenVL = async (model, imageBuffer) => {
  const base64Image = imageBuffer.toString('base64');
  const mimeType = detectMimeType(imageBuffer);
  const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

  // HF Inference API chat completions format for VL models
  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: imageDataUrl },
          },
          {
            type: 'text',
            text: USER_PROMPT,
          },
        ],
      },
    ],
    max_tokens: 1024,
    temperature: 0.1,
    stream: false,
  };

  try {
    // HF router endpoint (OpenAI-compatible)
    const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.warn(`[QwenVL] ${model} router returned ${res.status}: ${errBody.substring(0, 200)}`);
      // Try alternative endpoint format
      return await callQwenVLAlternative(model, imageBuffer);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return parseQwenResponse(content);
  } catch (err) {
    console.warn(`[QwenVL] ${model} failed:`, err.message);
    // Try alternative format
    return await callQwenVLAlternative(model, imageBuffer);
  }
};

/**
 * Alternative call format — uses the HF Inference API direct endpoint
 * which some providers route differently.
 */
const callQwenVLAlternative = async (model, imageBuffer) => {
  const base64Image = imageBuffer.toString('base64');
  const mimeType = detectMimeType(imageBuffer);
  const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

  // Try the hf-inference provider-specific route
  try {
    const payload = {
      model: `${model}:hf-inference`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageDataUrl },
            },
            {
              type: 'text',
              text: `${SYSTEM_PROMPT}\n\n${USER_PROMPT}`,
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.1,
      stream: false,
    };

    const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    if (!content) return null;
    return parseQwenResponse(content);
  } catch {
    return null;
  }
};

/**
 * Detect MIME type from buffer magic bytes.
 */
const detectMimeType = (buffer) => {
  if (!buffer || buffer.length < 4) return 'image/png';
  const hex = buffer.slice(0, 4).toString('hex');
  if (hex.startsWith('89504e47')) return 'image/png';
  if (hex.startsWith('ffd8ff')) return 'image/jpeg';
  if (hex.startsWith('47494638')) return 'image/gif';
  if (hex.startsWith('52494646')) return 'image/webp';
  return 'image/png';
};

/**
 * Parse Qwen2.5-VL response — extract JSON or fall back to raw text.
 */
const parseQwenResponse = (raw) => {
  if (!raw || typeof raw !== 'string') return null;

  // Try to extract JSON from the response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const text = cleanExtracted(parsed.text || parsed.extracted || parsed.ocr || '');
      const context = (parsed.context || parsed.description || parsed.image_description || '').trim();
      const signals = (parsed.signals || parsed.manipulation || parsed.flags || '').trim();

      if (text || context) {
        return {
          text,
          context: signals && signals.toLowerCase() !== 'none detected'
            ? `${context}. Signals: ${signals}`
            : context,
          signals,
        };
      }
    } catch {
      /* fall through to raw text parsing */
    }
  }

  // No valid JSON — try to extract useful content from raw text
  const cleaned = cleanExtracted(raw);
  if (cleaned.length > 10) {
    return { text: cleaned, context: '', signals: '' };
  }

  return null;
};

// ── Legacy Fallback Models ───────────────────────────────────────

const callLegacyOCR = async (imageBuffer) => {
  for (const model of LEGACY_OCR_MODELS) {
    try {
      const res = await fetch(`${HF_INFERENCE_BASE}/${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/octet-stream',
          Accept: 'application/json',
        },
        body: imageBuffer,
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
      if (text && text.trim().length > 3) return text.trim();
    } catch {
      continue;
    }
  }
  return null;
};

const callLegacyCaption = async (imageBuffer) => {
  for (const model of LEGACY_CAPTION_MODELS) {
    try {
      const res = await fetch(`${HF_INFERENCE_BASE}/${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/octet-stream',
          Accept: 'application/json',
        },
        body: imageBuffer,
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
      if (text && text.trim().length > 5) return text.trim();
    } catch {
      continue;
    }
  }
  return null;
};

// ── Public API ───────────────────────────────────────────────────

/**
 * Analyze an image using Qwen2.5-VL with multi-tier fallback.
 *
 * @param {Buffer|string} imageInput - image buffer, base64, data URL, or file path
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
      source: 'qwen-vl-fallback',
      model: null,
      confidence: 0,
      cached: false,
      multilingual: false,
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
      console.warn('[QwenVL] cache read failed:', err.message);
    }
  }

  if (!HF_TOKEN) {
    return {
      extractedText: '',
      imageContext: '',
      combinedText: '',
      source: 'qwen-vl-fallback',
      model: null,
      confidence: 0,
      cached: false,
      multilingual: false,
      error: 'HF_TOKEN not configured on server',
    };
  }

  // ── Tier 1: Qwen2.5-VL (primary multimodal engine) ──────────
  let extractedText = '';
  let imageContext = '';
  let modelUsed = null;
  const errors = [];

  for (const model of QWEN_VL_MODELS) {
    try {
      const result = await callQwenVL(model, buffer);
      if (result && (result.text || result.context)) {
        extractedText = result.text || '';
        imageContext = result.context || '';
        modelUsed = model;
        break;
      }
    } catch (err) {
      errors.push(`${model}: ${err.message}`);
    }
  }

  // ── Tier 2: Legacy OCR + captioning fallback ─────────────────
  if (!extractedText && !imageContext) {
    console.warn('[QwenVL] All Qwen models failed, trying legacy fallback...');

    // Try OCR
    try {
      const ocrText = await callLegacyOCR(buffer);
      if (ocrText) {
        extractedText = cleanExtracted(ocrText);
        modelUsed = 'legacy-ocr';
      }
    } catch (err) {
      errors.push(`legacy-ocr: ${err.message}`);
    }

    // Try captioning
    try {
      const caption = await callLegacyCaption(buffer);
      if (caption) {
        imageContext = caption;
        if (!modelUsed) modelUsed = 'legacy-caption';
      }
    } catch (err) {
      errors.push(`legacy-caption: ${err.message}`);
    }
  }

  // ── Nothing worked ───────────────────────────────────────────
  if (!extractedText && !imageContext) {
    return {
      extractedText: '',
      imageContext: '',
      combinedText: '',
      source: 'qwen-vl-fallback',
      model: null,
      confidence: 0,
      cached: false,
      multilingual: false,
      error: errors.join(' | ') || 'All models returned empty results',
    };
  }

  // ── Build result ─────────────────────────────────────────────
  const multilingual = detectMultilingual(extractedText);
  const combinedText = [
    imageContext ? `[Image context: ${imageContext}]` : '',
    extractedText,
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();

  const confidence = Math.min(100, Math.round(
    (extractedText.length > 50 ? 70 : extractedText.length > 20 ? 50 : 20) +
    (imageContext ? 20 : 0) +
    (modelUsed?.includes('Qwen') ? 10 : 0)
  ));

  const source = modelUsed?.includes('Qwen') ? 'qwen-vl'
    : modelUsed?.includes('legacy') ? 'legacy-fallback'
    : 'qwen-vl';

  const payload = {
    extractedText,
    imageContext,
    combinedText,
    source,
    model: modelUsed,
    confidence,
    cached: false,
    multilingual,
  };

  // ── Cache write ──────────────────────────────────────────────
  if (useCache && redisClient?.isOpen) {
    try {
      await redisClient.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(payload));
    } catch (err) {
      console.warn('[QwenVL] cache write failed:', err.message);
    }
  }

  return payload;
};

/**
 * Analyze a remote image URL. Fetches the image server-side, then
 * defers to analyzeImage().
 */
const analyzeImageUrl = async (url, opts = {}) => {
  if (!url || typeof url !== 'string') {
    return {
      extractedText: '',
      imageContext: '',
      combinedText: '',
      source: 'qwen-vl-fallback',
      model: null,
      confidence: 0,
      cached: false,
      multilingual: false,
      error: 'No URL provided',
    };
  }
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'TruthScanAI/1.0 (Image Analysis)',
        Accept: 'image/*',
      },
    });
    if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    return analyzeImage(Buffer.from(arrayBuf), opts);
  } catch (err) {
    return {
      extractedText: '',
      imageContext: '',
      combinedText: '',
      source: 'qwen-vl-fallback',
      model: null,
      confidence: 0,
      cached: false,
      multilingual: false,
      error: err.message,
    };
  }
};

module.exports = {
  analyzeImage,
  analyzeImageUrl,
  QWEN_VL_MODELS,
  _internal: { hashBuffer, cleanExtracted, parseQwenResponse, detectMultilingual, detectMimeType },
};
