/**
 * BullMQ worker for DeepSeek-VL image analysis.
 *
 * Job data shape:
 *   { imagePath?: string, imageBase64?: string, imageUrl?: string, jobType: 'upload' | 'url', userId?: string }
 *
 * Returns the DeepSeek-VL analyzeImage payload so the API can surface
 * the result via job status polling or the WebSocket bridge.
 */

const fs = require('fs');
const { startWorker, isQueueAvailable } = require('../config/queue');
const { analyzeImage, analyzeImageUrl } = require('../services/deepseekOCRService');
const { emitToUser } = require('./socket');

const processor = async (job) => {
  const { imagePath, imageBase64, imageUrl, jobType, userId } = job.data || {};

  await job.updateProgress(10);

  let result;
  if (jobType === 'url' && imageUrl) {
    result = await analyzeImageUrl(imageUrl);
  } else if (imageBase64) {
    result = await analyzeImage(imageBase64);
  } else if (imagePath && fs.existsSync(imagePath)) {
    const buffer = fs.readFileSync(imagePath);
    result = await analyzeImage(buffer);
  } else {
    throw new Error('No image payload provided to worker');
  }

  await job.updateProgress(90);

  // Best-effort cleanup of local uploads
  if (imagePath && fs.existsSync(imagePath)) {
    try { fs.unlinkSync(imagePath); } catch { /* noop */ }
  }

  // Push real-time update over the WebSocket bridge if the user
  // subscribed. The homepage LiveNews live-scan section listens on
  // `image-analysis:update` for silent enrichment.
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
    console.log('[worker] image-analysis worker started');
  }
  return worker;
};

module.exports = { start, processor };
