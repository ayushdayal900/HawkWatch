/**
 * context/AuthContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Global authentication state for HawkWatch.
 *
 * Features:
 *   • Verifies stored token on mount via GET /api/auth/me (no stale data risk)
 *   • Automatic silent token refresh on 401 before redirecting to /login
 *   • Role-aware helpers: isAdmin, isExaminer, isStudent
 *   • Clears all auth state on logout
 *
 * Usage:
 *   const { user, loading, login, logout, register, isAdmin } = useAuth();
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

/* ─── Storage helpers ──────────────────────────────────────────────────── */
const KEYS = {
    token:   'hawkwatch_token',
    refresh: 'hawkwatch_refresh',
    user:    'hawkwatch_user',
};

const storage = {
    get:   (k)    => localStorage.getItem(k),
    set:   (k, v) => localStorage.setItem(k, v),
    remove:(k)    => localStorage.removeItem(k),
    clearAll: ()  => Object.values(KEYS).forEach(k => localStorage.removeItem(k)),
};

/* ─── Provider ─────────────────────────────────────────────────────────── */
export function AuthProvider({ children }) {
    const [user,    setUser]    = useState(null);
    const [loading, setLoading] = useState(true);

    // Keep a ref so the api.js interceptor can call refresh without
    // creating a circular import.
    const refreshRef = useRef(null);

    /* ── On-mount: verify the stored token is still valid ─────────────── */
    useEffect(() => {
        const validate = async () => {
            const token = storage.get(KEYS.token);
            if (!token) { setLoading(false); return; }

            try {
                const { data } = await authAPI.getMe();
                setUser(data.user);
                // Keep localStorage user in sync with server truth
                storage.set(KEYS.user, JSON.stringify(data.user));
            } catch {
                // Token may be expired — attempt a silent refresh
                const refreshToken = storage.get(KEYS.refresh);
                if (refreshToken) {
                    try {
                        const { data } = await authAPI.refresh(refreshToken);
                        storage.set(KEYS.token,   data.accessToken);
                        storage.set(KEYS.refresh, data.refreshToken);

                        const { data: me } = await authAPI.getMe();
                        setUser(me.user);
                        storage.set(KEYS.user, JSON.stringify(me.user));
                    } catch {
                        // Refresh also failed — clear everything
                        storage.clearAll();
                        setUser(null);
                    }
                } else {
                    storage.clearAll();
                    setUser(null);
                }
            } finally {
                setLoading(false);
            }
        };

        validate();
    }, []);

    /* ── login ─────────────────────────────────────────────────────────── */
    const login = useCallback(async (email, password) => {
        const { data } = await authAPI.login({ email, password });
        storage.set(KEYS.token,   data.accessToken);
        storage.set(KEYS.refresh, data.refreshToken);
        storage.set(KEYS.user,    JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    }, []);

    /* ── register ──────────────────────────────────────────────────────── */
    const register = useCallback(async (formData) => {
        const { data } = await authAPI.register(formData);
        storage.set(KEYS.token,   data.accessToken);
        storage.set(KEYS.refresh, data.refreshToken);
        storage.set(KEYS.user,    JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    }, []);

    /* ── logout ────────────────────────────────────────────────────────── */
    const logout = useCallback(async () => {
        try { await authAPI.logout(); } catch { /* server-side invalidation best-effort */ }
        storage.clearAll();
        setUser(null);
    }, []);

    /* ── silent refresh (exposed via ref for api.js interceptor) ───────── */
    const silentRefresh = useCallback(async () => {
        const refreshToken = storage.get(KEYS.refresh);
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await authAPI.refresh(refreshToken);
        storage.set(KEYS.token,   data.accessToken);
        storage.set(KEYS.refresh, data.refreshToken);
        return data.accessToken;
    }, []);

    refreshRef.current = silentRefresh;

    /* ── Role helpers ──────────────────────────────────────────────────── */
    const isAdmin    = user?.role === 'admin';
    const isExaminer = user?.role === 'examiner';
    const isStudent  = user?.role === 'student';

    /* ── Update local user state (e.g. after profile edit) ────────────── */
    const updateUser = useCallback((patch) => {
        setUser((prev) => {
            const updated = { ...prev, ...patch };
            storage.set(KEYS.user, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const value = {
        user,
        loading,
        isAdmin,
        isExaminer,
        isStudent,
        login,
        logout,
        register,
        updateUser,
        silentRefresh,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/* ─── Hook ─────────────────────────────────────────────────────────────── */
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}

export default AuthContext;
