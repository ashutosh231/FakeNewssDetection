/**
 * WebSocket bridge for live scan updates.
 *
 * Lazy-initialized Socket.IO server. The /detect, /scan, and homepage
 * live-news section subscribe to their user's room to receive
 * `image-analysis:update` events whenever a background job finishes.
 *
 * All methods are no-ops if socket.io is not installed — keeps the
 * existing HTTP-only workflow functional.
 */

let SocketServer = null;
try {
  // eslint-disable-next-line global-require
  SocketServer = require('socket.io').Server;
} catch {
  SocketServer = null;
}

let io = null;

const attach = (httpServer) => {
  if (!SocketServer) {
    console.log('[socket] socket.io not installed — live updates disabled.');
    return null;
  }
  if (io) return io;

  const allowedOrigins = [
    'http://localhost:5173',
    'https://truthscannai.netlify.app',
    process.env.CLIENT_URL,
  ].filter(Boolean);

  io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('CORS blocked for socket'));
      },
      credentials: true,
    },
    path: '/ws',
  });

  io.on('connection', (socket) => {
    socket.on('subscribe', ({ userId } = {}) => {
      if (userId) socket.join(`user:${userId}`);
    });
    socket.on('unsubscribe', ({ userId } = {}) => {
      if (userId) socket.leave(`user:${userId}`);
    });
  });

  console.log('[socket] live-update server attached on /ws');
  return io;
};

const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  try {
    io.to(`user:${userId}`).emit(event, payload);
  } catch (err) {
    console.warn('[socket] emit failed:', err.message);
  }
};

const broadcast = (event, payload) => {
  if (!io) return;
  try {
    io.emit(event, payload);
  } catch (err) {
    console.warn('[socket] broadcast failed:', err.message);
  }
};

module.exports = { attach, emitToUser, broadcast };
