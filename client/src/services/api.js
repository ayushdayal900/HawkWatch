import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('hawkwatch_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 401 globally — clear auth and redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('hawkwatch_token');
            localStorage.removeItem('hawkwatch_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
    logout: () => api.post('/auth/logout'),
    refresh: (token) => api.post('/auth/refresh', { refreshToken: token }),
};

// Exams API
export const examAPI = {
    getAll: () => api.get('/exams'),
    getById: (id) => api.get(`/exams/${id}`),
    create: (data) => api.post('/exams', data),
    update: (id, data) => api.put(`/exams/${id}`, data),
    delete: (id) => api.delete(`/exams/${id}`),
    publish: (id) => api.patch(`/exams/${id}/publish`),
};

// Proctoring API
export const proctoringAPI = {
    startSession: (data) => api.post('/proctoring/start', data),
    endSession: (sessionId) => api.post(`/proctoring/${sessionId}/end`),
    flagEvent: (sessionId, data) => api.post(`/proctoring/${sessionId}/flag`, data),
    analyzeFrame: (sessionId, frameB64) => api.post(`/proctoring/${sessionId}/analyze-frame`, { frameBase64: frameB64, timestamp: Date.now() }),
    updateBehavioral: (sessionId, data) => api.post(`/proctoring/${sessionId}/behavioral`, data),
    getReport: (sessionId) => api.get(`/proctoring/${sessionId}/report`),
};

export default api;
