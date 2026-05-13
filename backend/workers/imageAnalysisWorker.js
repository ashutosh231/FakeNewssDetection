/**
 * BullMQ worker for Qwen2.5-VL image analysis.
 *
 * Job data shape:
 *   { imagePath?: string, imageBase64?: string, imageUrl?: string, jobType: 'upload' | 'url', userId?: string }
 *
 * Uses Qwen2.5-VL as primary with legacy fallback, then emits the
 * result via WebSocket for real-time updates.
 */

const fs = require('fs');
const { startWorker, isQueueAvailable } = require('../config/queue');
const { analyzeImage: qwenAnalyze, analyzeImageUrl: qwenAnalyzeUrl } = require('../services/qwenVLService');
const { analyzeImage: legacyAnalyze, analyzeImageUrl: legacyAnalyzeUrl } = require('../services/deepseekOCRService');
const { emitToUser } = require('./socket');

const runAnalysis = async (imageInput, opts = {}) => {
  const qwenResult = await qwenAnalyze(imageInput, opts);
  if (qwenResult && (qwenResult.extractedText || qwenResult.imageContext) && !qwenResult.error) {
    return qwenResult;
  }
  return await legacyAnalyze(imageInput, opts);
};

const processor = async (job) => {
  const { imagePath, imageBase64, imageUrl, jobType, userId } = job.data || {};

  await job.updateProgress(10);

  let result;
  if (jobType === 'url' && imageUrl) {
    const qwenResult = await qwenAnalyzeUrl(imageUrl);
    result = (qwenResult && !qwenResult.error) ? qwenResult : await legacyAnalyzeUrl(imageUrl);
  } else if (imageBase64) {
    result = await runAnalysis(imageBase64);
  } else if (imagePath && fs.existsSync(imagePath)) {
    const buffer = fs.readFileSync(imagePath);
    result = await runAnalysis(buffer);
  } else {
    throw new Error('No image payload provided to worker');
  }

  await job.updateProgress(90);

  // Best-effort cleanup of local uploads
  if (imagePath && fs.existsSync(imagePath)) {
    try { fs.unlinkSync(imagePath); } catch { /* noop */ }
  }

  // Push real-time update over the WebSocket bridge
  if (userId) {
    emitToUser(userId, 'image-analysis:update', {
      jobId: job.id,
      status: 'completed',
      result,
    });
  }

  await job.updateProgress(100);
  return result;
};

const start = () => {
  if (!isQueueAvailable()) {
    console.log('[worker] image-analysis queue unavailable — skipping worker start.');
    return null;
  }
  const worker = startWorker(processor);
  if (worker) {
    console.log('[worker] image-analysis worker started (Qwen2.5-VL + legacy fallback)');
  }
  return worker;
};

module.exports = { start, processor };
