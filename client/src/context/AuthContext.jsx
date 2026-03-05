import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('hawkwatch_user');
        const token = localStorage.getItem('hawkwatch_token');
        if (stored && token) {
            try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (email, password) => {
        const { data } = await authAPI.login({ email, password });
        localStorage.setItem('hawkwatch_token', data.accessToken);
        localStorage.setItem('hawkwatch_user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(async () => {
        try { await authAPI.logout(); } catch { /* ignore */ }
        localStorage.removeItem('hawkwatch_token');
        localStorage.removeItem('hawkwatch_user');
        setUser(null);
    }, []);

    const register = useCallback(async (formData) => {
        const { data } = await authAPI.register(formData);
        localStorage.setItem('hawkwatch_token', data.accessToken);
        localStorage.setItem('hawkwatch_user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
