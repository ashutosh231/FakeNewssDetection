/**
 * Thin socket.io-client wrapper for live scan updates from the backend
 * image-analysis BullMQ worker.
 *
 * Usage:
 *   import { subscribeToLiveScans } from '../services/liveSocket'
 *   const unsub = subscribeToLiveScans(userId, (evt) => { ... })
 *
 * Does nothing gracefully if socket.io-client is not installed — the
 * rest of the app keeps working as HTTP-only. No existing UI depends
 * on this, so unavailability is a silent no-op.
 */

const WS_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

let socket = null;
let ioFactory = null;
let loadPromise = null;

const loadFactory = async () => {
  if (ioFactory) return ioFactory;
  if (!loadPromise) {
    loadPromise = import('socket.io-client')
      .then((mod) => {
        ioFactory = mod?.io || mod?.default?.io || mod?.default || null;
        return ioFactory;
      })
      .catch(() => {
        ioFactory = null;
        return null;
      });
  }
  return loadPromise;
};

const connect = async () => {
  const factory = await loadFactory();
  if (!factory) return null;
  if (socket && socket.connected) return socket;
  socket = factory(WS_URL, {
    path: '/ws',
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });
  return socket;
};

export const subscribeToLiveScans = (userId, onUpdate) => {
  let active = true;
  let unsub = () => {};

  connect().then((s) => {
    if (!active || !s) return;

    const listener = (payload) => {
      try { onUpdate?.(payload); } catch { /* noop */ }
    };

    const onConnect = () => {
      if (userId) s.emit('subscribe', { userId });
    };

    s.on('connect', onConnect);
    if (s.connected && userId) s.emit('subscribe', { userId });
    s.on('image-analysis:update', listener);

    unsub = () => {
      s.off('connect', onConnect);
      s.off('image-analysis:update', listener);
      if (userId) s.emit('unsubscribe', { userId });
    };
  });

  return () => {
    active = false;
    unsub();
  };
};
