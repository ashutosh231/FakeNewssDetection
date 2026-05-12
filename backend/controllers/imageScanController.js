/**
 * Controller for DeepSeek-VL image analysis endpoints.
 *
 * Design constraints:
 *  - Does NOT change the existing /api/scan/text response contract.
 *  - Adds additive endpoints that return extracted text + contextual
 *    description which the frontend can feed into its existing
 *    analysis pipeline unchanged.
 *  - Prefers background (BullMQ) execution when available; falls back
 *    to inline execution otherwise.
 */

const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const { analyzeImage, analyzeImageUrl } = require('../services/deepseekOCRService');
const { getImageQueue, isQueueAvailable } = require('../config/queue');

const BG_THRESHOLD_BYTES = 350 * 1024; // ~350KB — defer heavier images to BullMQ

/**
 * POST /api/scan/image
 * Multipart form field: "image"
 * OR JSON body { imageBase64: "...", async?: boolean }
 *
 * Returns the stable DeepSeek-VL payload. Adds `jobId` when deferred.
 */
const analyzeUploadedImage = asyncHandler(async (req, res) => {
  const wantAsync = String(req.query?.async || req.body?.async || '').toLowerCase() === 'true';

  // Resolve image source
  let imagePath = null;
  let imageBase64 = null;
  let byteSize = 0;

  if (req.file) {
    imagePath = req.file.path;
    byteSize = req.file.size || 0;
  } else if (req.body?.imageBase64) {
    imageBase64 = req.body.imageBase64;
    byteSize = Buffer.byteLength(imageBase64, 'utf8');
  } else if (req.body?.imageUrl) {
    // URL variant handled by analyzeImageUrl below
  } else {
    res.status(400);
    throw new Error('No image provided. Send multipart field "image" or JSON { imageBase64 } or { imageUrl }.');
  }

  const shouldDefer =
    wantAsync || (byteSize > BG_THRESHOLD_BYTES && isQueueAvailable());

  // ── Background path (BullMQ) ─────────────────────────────────
  if (shouldDefer) {
    const queue = getImageQueue();
    if (queue) {
      const job = await queue.add('analyze', {
        imagePath,
        imageBase64,
        imageUrl: req.body?.imageUrl,
        jobType: req.body?.imageUrl ? 'url' : 'upload',
        userId: req.user?._id?.toString(),
      });
      return res.status(202).json({
        success: true,
        deferred: true,
        jobId: job.id,
        message: 'Image queued for DeepSeek-VL analysis. Subscribe via /ws or poll /api/scan/image/:jobId.',
      });
    }
  }

  // ── Inline path ──────────────────────────────────────────────
  let result;
  if (req.body?.imageUrl) {
    result = await analyzeImageUrl(req.body.imageUrl);
  } else if (imagePath) {
    const buffer = fs.readFileSync(imagePath);
    result = await analyzeImage(buffer);
  } else {
    result = await analyzeImage(imageBase64);
  }

  // Best-effort cleanup
  if (imagePath) {
    try { fs.unlinkSync(imagePath); } catch { /* noop */ }
  }

  res.json({
    success: true,
    deferred: false,
    data: result,
  });
});

/**
 * GET /api/scan/image/:jobId — poll for background job status + result.
 */
const getImageJobStatus = asyncHandler(async (req, res) => {
  const queue = getImageQueue();
  if (!queue) {
    res.status(503);
    throw new Error('Background queue not available');
  }

  const job = await queue.getJob(req.params.jobId);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const state = await job.getState();
  const progress = job.progress;
  const result = state === 'completed' ? await job.returnvalue : null;
  const failedReason = state === 'failed' ? job.failedReason : null;

  res.json({
    success: true,
    jobId: job.id,
    state,
    progress,
    result,
    failedReason,
  });
});

/**
 * POST /api/scan/image/url
 * Body: { imageUrl: "https://..." }
 * Convenience endpoint used by the homepage LiveNews section to
 * silently enrich article thumbnails with DeepSeek-VL context.
 */
const analyzeRemoteImage = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body || {};
  if (!imageUrl) {
    res.status(400);
    throw new Error('imageUrl is required');
  }
  const result = await analyzeImageUrl(imageUrl);
  res.json({ success: true, data: result });
});

module.exports = {
  analyzeUploadedImage,
  getImageJobStatus,
  analyzeRemoteImage,
};
