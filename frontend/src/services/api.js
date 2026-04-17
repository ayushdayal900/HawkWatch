/**
 * services/api.js
 * ─────────────────────────────────────────────────────────────────────────
 * Centralised Axios instance for HawkWatch.
 *
 *  • Attaches JWT access token to every request
 *  • On 401: attempts silent token refresh once, then retries
 *  • On double-401: clears auth and redirects to /login
 *  • Exposes typed sub-APIs: authAPI, examAPI, proctoringAPI
 * ─────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';

/* ─── Storage keys (must match AuthContext.jsx) ─────────────────────── */
const KEYS = {
    token:   'hawkwatch_token',
    refresh: 'hawkwatch_refresh',
    user:    'hawkwatch_user',
};

const clearAuth = () => Object.values(KEYS).forEach(k => localStorage.removeItem(k));

/* ─── Axios instance ────────────────────────────────────────────────── */
const api = axios.create({
    baseURL: '/api',
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
});

/* ─── Request interceptor — attach Bearer token ─────────────────────── */
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(KEYS.token);
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

/* ─── Response interceptor — silent token refresh on 401 ────────────── */
let _refreshing   = false;           // lock: only one refresh at a time
let _waitQueue     = [];             // requests queued while refresh is in flight

const processQueue = (error, newToken = null) => {
    _waitQueue.forEach(({ resolve, reject }) =>
        error ? reject(error) : resolve(newToken)
    );
    _waitQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        // Only intercept 401s that aren't already from the refresh endpoint,
        // and haven't already been retried.
        const is401          = error.response?.status === 401;
        const isRefreshCall  = original.url?.includes('/auth/refresh');
        const alreadyRetried = original._retry;

        if (!is401 || isRefreshCall || alreadyRetried) {
            return Promise.reject(error);
        }

        const refreshToken = localStorage.getItem(KEYS.refresh);
        if (!refreshToken) {
            clearAuth();
            window.location.href = '/login';
            return Promise.reject(error);
        }

        // Queue subsequent 401s while a refresh is already in-flight
        if (_refreshing) {
            return new Promise((resolve, reject) => {
                _waitQueue.push({ resolve, reject });
            }).then((newToken) => {
                original.headers.Authorization = `Bearer ${newToken}`;
                return api(original);
            });
        }

        _refreshing     = true;
        original._retry = true;

        try {
            const { data } = await api.post('/auth/refresh', { refreshToken });

            localStorage.setItem(KEYS.token,   data.accessToken);
            localStorage.setItem(KEYS.refresh, data.refreshToken);

            api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
            original.headers.Authorization            = `Bearer ${data.accessToken}`;

            processQueue(null, data.accessToken);
            return api(original);
        } catch (refreshError) {
            processQueue(refreshError);
            clearAuth();
            window.location.href = '/login';
            return Promise.reject(refreshError);
        } finally {
            _refreshing = false;
        }
    }
);

/* ─── Auth API ──────────────────────────────────────────────────────── */
export const authAPI = {
    register: (data)         => api.post('/auth/register', data),
    login:    (data)         => api.post('/auth/login',    data),
    getMe:    ()             => api.get ('/auth/me'),
    logout:   ()             => api.post('/auth/logout'),
    refresh:  (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

/* ─── Exams API ─────────────────────────────────────────────────────── */
export const examAPI = {
    getStats: ()           => api.get   ('/exams/stats'),
    getHistory: ()         => api.get   ('/exams/history'),
    getAll:   ()           => api.get   ('/exams'),
    getById:  (id)         => api.get   (`/exams/${id}`),
    create:   (data)       => api.post  ('/exams', data),
    update:   (id, data)   => api.put   (`/exams/${id}`, data),
    remove:   (id)         => api.delete(`/exams/${id}`),
    publish:  (id)         => api.patch (`/exams/${id}/publish`),
    getAttempt: (id)       => api.get(`/exams/attempt/${id}`),
};

/* ─── Proctoring API ────────────────────────────────────────────────── */
export const proctoringAPI = {
    startSession:    (data)                 => api.post(`/proctoring/start`,                       data),
    endSession:      (sessionId)            => api.post(`/proctoring/${sessionId}/end`),
    flagEvent:       (sessionId, data)      => api.post(`/proctoring/${sessionId}/flag`,           data),
    analyzeFrame:    (sessionId, frameB64)  => api.post(`/proctoring/${sessionId}/analyze-frame`,  { frameBase64: frameB64, timestamp: Date.now() }),
    updateBehavioral:(sessionId, data)      => api.post(`/proctoring/${sessionId}/behavioral`,     data),
    updateBehavioral:(sessionId, data)      => api.post(`/proctoring/${sessionId}/behavioral`,     data),
    getReport:       (sessionId)            => api.get (`/proctoring/${sessionId}/report`),
    submitReview:    (sessionId, data)      => api.patch(`/proctoring/${sessionId}/review`, data),
    getActiveSessions: ()                   => api.get ('/proctoring/active'),
};

/* ─── Verification API ──────────────────────────────────────────────── */
export const verificationAPI = {
    start:       (data) => api.post('/verification/start', data),
    verifyId:    (data) => api.post('/verification/id', data),
    liveness:    (data) => api.post('/verification/liveness', data),
    face:        (data) => api.post('/verification/face', data),
    environment: (data) => api.post('/verification/environment', data),
    getStatus:   (id)   => api.get(`/verification/status/${id}`),
};

export default api;
