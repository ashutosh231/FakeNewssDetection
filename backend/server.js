const app = require('./app');
const socketBridge = require('./workers/socket');
const imageWorker = require('./workers/imageAnalysisWorker');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Attach WebSocket bridge for live scan updates (additive — does not
// alter existing HTTP request/response flows).
socketBridge.attach(server);

// Start BullMQ worker for DeepSeek-VL image analysis jobs.
try {
  imageWorker.start();
} catch (err) {
  console.warn('[server] image worker failed to start:', err.message);
}

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
