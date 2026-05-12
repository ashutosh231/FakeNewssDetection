/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BullMQ queue bootstrap — used for heavy image analysis tasks
 * (DeepSeek-VL OCR + contextual understanding).
 *
 * The queue is instantiated lazily so the rest of the backend keeps
 * starting cleanly if BullMQ or the Redis connection is unavailable.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

let Queue, Worker, QueueEvents, IORedis;
try {
  // Lazy require so environments without these packages still boot.
  // eslint-disable-next-line global-require
  ({ Queue, Worker, QueueEvents } = require('bullmq'));
  // eslint-disable-next-line global-require
  IORedis = require('ioredis');
} catch (err) {
  console.warn('[queue] BullMQ/ioredis not installed — background jobs disabled.');
}

const QUEUE_NAME = 'image-analysis';

let connection = null;
let imageQueue = null;
let queueEvents = null;

const getConnection = () => {
  if (!IORedis) return null;
  if (connection) return connection;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  connection = new IORedis(url, { maxRetriesPerRequest: null });
  connection.on('error', (err) => console.warn('[queue] redis error:', err.message));
  return connection;
};

const getImageQueue = () => {
  if (imageQueue) return imageQueue;
  if (!Queue) return null;
  const conn = getConnection();
  if (!conn) return null;
  imageQueue = new Queue(QUEUE_NAME, {
    connection: conn,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
  return imageQueue;
};

const getQueueEvents = () => {
  if (queueEvents) return queueEvents;
  if (!QueueEvents) return null;
  const conn = getConnection();
  if (!conn) return null;
  queueEvents = new QueueEvents(QUEUE_NAME, { connection: conn });
  return queueEvents;
};

const startWorker = (processor) => {
  if (!Worker) return null;
  const conn = getConnection();
  if (!conn) return null;
  const worker = new Worker(QUEUE_NAME, processor, {
    connection: conn,
    concurrency: Number(process.env.IMAGE_WORKER_CONCURRENCY || 2),
  });
  worker.on('failed', (job, err) => {
    console.warn(`[worker] job ${job?.id} failed:`, err?.message);
  });
  return worker;
};

const isQueueAvailable = () => !!getImageQueue();

module.exports = {
  QUEUE_NAME,
  getImageQueue,
  getQueueEvents,
  startWorker,
  isQueueAvailable,
};
