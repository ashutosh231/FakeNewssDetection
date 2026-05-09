// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CENTRALIZED API CLIENT
// All backend calls go through this module.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// In production → calls Render directly (e.g. https://truthscanai-vqij.onrender.com/api)
// In development → calls localhost (e.g. http://localhost:5001/api)
const API_BASE =
  import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : 'http://localhost:5001/api';

/**
 * Core fetch wrapper with:
 *  - credentials (cookies) included
 *  - JSON parsing with HTML-response guard
 *  - structured error throwing
 */
const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;

  let res;
  try {
    res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
  } catch (networkErr) {
    // Network-level failure (CORS block, DNS, offline, etc.)
    const error = new Error('Network error — could not reach the server. Please check your connection.');
    error.status = 0;
    error.isNetworkError = true;
    throw error;
  }

  // Guard: if the server returned HTML instead of JSON (e.g. Netlify 404 page)
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const error = new Error(
      res.status === 404
        ? 'API endpoint not found (404).'
        : `Server returned unexpected response (${res.status}).`
    );
    error.status = res.status;
    error.isHtmlResponse = true;
    throw error;
  }

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || 'Something went wrong');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
};

// ── Auth APIs ──────────────────────────────────────────
export const signupUser = (name, email, password) =>
  apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

export const googleAuth = (data) =>
  apiFetch('/auth/google', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const verifyOtp = (email, otp) =>
  apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });

export const loginUser = (email, password) =>
  apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const logoutUser = () =>
  apiFetch('/auth/logout', { method: 'POST' });

export const getProfile = () =>
  apiFetch('/auth/me');

export const updateProfile = (formData) =>
  fetch(`${API_BASE}/auth/me`, {
    method: 'PUT',
    credentials: 'include',
    body: formData, // FormData for file uploads — no Content-Type header
  }).then(async (res) => {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Server returned unexpected response (${res.status}).`);
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Update failed');
    return data;
  });

// ── Scan APIs ──────────────────────────────────────────
export const saveScanResult = (scanData) =>
  apiFetch('/scan/text', {
    method: 'POST',
    body: JSON.stringify(scanData),
  });

export const getScanHistory = () =>
  apiFetch('/scan/history');

// ── Account Management ─────────────────────────────────
export const requestDeleteOtp = () =>
  apiFetch('/auth/request-delete-otp', {
    method: 'POST',
  });

export const deleteAccount = (otp) =>
  apiFetch('/auth/delete-account', {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });

export const sendSupportQuery = (message) =>
  apiFetch('/auth/support', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });

// ── Payment APIs ───────────────────────────────────────
export const createPaymentOrder = () =>
  apiFetch('/payment/create-order', { method: 'POST' });

export const verifyPayment = (paymentData) =>
  apiFetch('/payment/verify-payment', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
