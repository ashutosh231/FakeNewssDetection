const API_BASE = 'http://localhost:5001/api';

const apiFetch = async (endpoint, options = {}) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || 'Something went wrong');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
};

// ── Auth APIs ──
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Update failed');
    return data;
  });

// ── Scan APIs ──
export const saveScanResult = (scanData) =>
  apiFetch('/scan/text', {
    method: 'POST',
    body: JSON.stringify(scanData),
  });

export const getScanHistory = () =>
  apiFetch('/scan/history');

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

// ── Payment APIs ──
export const createPaymentOrder = () =>
  apiFetch('/payment/create-order', { method: 'POST' });

export const verifyPayment = (paymentData) =>
  apiFetch('/payment/verify-payment', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
