/**
 * services/api.js
 * ─────────────────────────────────────────────────────────────────────────
 * Centralised Axios instance for HawkWatch.
 *
 *  • Attaches JWT access token to every request from Zustand store
 *  • Exponential backoff retry mechanism
 *  • On 401: attempts silent token refresh once, then retries
 *  • On double-401: clears auth and redirects to /login
 * ─────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';

/* ─── Storage retrieval ─────────────────────────────────────────────── */
const getAuthData = () => {
    try {
        const authStorage = localStorage.getItem('hawkwatch-auth');
        if (!authStorage) return null;
        return JSON.parse(authStorage).state;
    } catch (e) {
        return null;
    }
};

const clearAuth = () => {
    localStorage.removeItem('hawkwatch-auth');
    window.location.href = '/login';
};

/* ─── Axios instance ────────────────────────────────────────────────── */
const api = axios.create({
    baseURL: '/api',
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
});

/* ─── Request interceptor — attach Bearer token ─────────────────────── */
api.interceptors.request.use(
    (config) => {
        const auth = getAuthData();
        if (auth?.token) {
            config.headers.Authorization = `Bearer ${auth.token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/* ─── Retry logic and Token Refresh ─────────────────────────────────── */
let _refreshing = false;
let _waitQueue = [];

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

        // Ensure retry config
        original._retryCount = original._retryCount || 0;

        const is401 = error.response?.status === 401;
        const isRefreshCall = original.url?.includes('/auth/refresh');
        
        // 1. Handle 401 Unauthorized (Token Refresh Flow)
        if (is401 && !isRefreshCall && !original._isRetryForAuth) {
            const auth = getAuthData();
            if (!auth?.refreshToken) {
                clearAuth();
                return Promise.reject(error);
            }

            if (_refreshing) {
                return new Promise((resolve, reject) => {
                    _waitQueue.push({ resolve, reject });
                }).then((newToken) => {
                    original.headers.Authorization = `Bearer ${newToken}`;
                    return api(original);
                }).catch(err => Promise.reject(err));
            }

            _refreshing = true;
            original._isRetryForAuth = true;

            try {
                const { data } = await axios.post('/api/auth/refresh', { refreshToken: auth.refreshToken });
                
                // Update Zustand persist storage manually
                const currentStorage = JSON.parse(localStorage.getItem('hawkwatch-auth'));
                currentStorage.state.token = data.data?.accessToken || data.accessToken;
                currentStorage.state.refreshToken = data.data?.refreshToken || data.refreshToken;
                localStorage.setItem('hawkwatch-auth', JSON.stringify(currentStorage));

                const newToken = currentStorage.state.token;
                api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
                original.headers.Authorization = `Bearer ${newToken}`;

                processQueue(null, newToken);
                return api(original);
            } catch (refreshError) {
                processQueue(refreshError);
                clearAuth();
                return Promise.reject(refreshError);
            } finally {
                _refreshing = false;
            }
        }

        // 2. Exponential Backoff Retry for 5xx or Network Errors
        const shouldRetry = (!error.response || error.response.status >= 500) && original._retryCount < 3;
        if (shouldRetry) {
            original._retryCount += 1;
            const backoff = Math.pow(2, original._retryCount) * 1000; // 2s, 4s, 8s
            
            return new Promise(resolve => {
                setTimeout(() => resolve(api(original)), backoff);
            });
        }

        // Standardize error format
        const errorMsg = error.response?.data?.message || error.message || 'An unexpected error occurred';
        return Promise.reject({
            success: false,
            error: errorMsg,
            status: error.response?.status
        });
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
    getReport:       (sessionId)            => api.get (`/proctoring/${sessionId}/report`),
    submitReview:    (sessionId, data)      => api.patch(`/proctoring/${sessionId}/review`, data),
    getActiveSessions: ()                   => api.get ('/proctoring/active'),
};

export const verificationAPI = {
    start:       (data) => api.post('/verification/start', data),
    verifyId:    (data) => api.post('/verification/id', data),
    liveness:    (data) => api.post('/verification/liveness', data),
    face:        (data) => api.post('/verification/face', data),
    environment: (data) => api.post('/verification/environment', data),
    getStatus:   (id)   => api.get(`/verification/status/${id}`),
};

/* ─── Organization API ──────────────────────────────────────────────── */
export const organizationAPI = {
    getAll: () => api.get('/organizations'),
    create: (data) => api.post('/organizations', data),
};

export default api;
