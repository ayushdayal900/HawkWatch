import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            refreshToken: null,
            loading: false,

            // Derived role booleans — recomputed from `user` whenever it changes
            isAdmin:    false,
            isExaminer: false,
            isStudent:  false,

            setAuth: (user, token, refreshToken) => set({
                user,
                token,
                refreshToken,
                isAdmin:    user?.role === 'admin',
                isExaminer: user?.role === 'examiner',
                isStudent:  user?.role === 'student',
            }),
            
            logout: async () => {
                try {
                    await authAPI.logout();
                } catch (e) {
                    // ignore
                }
                set({ user: null, token: null, refreshToken: null, isAdmin: false, isExaminer: false, isStudent: false });
            },

            login: async (email, password) => {
                set({ loading: true });
                try {
                    const { data } = await authAPI.login({ email, password });
                    const user = data.data?.user || data.user;
                    set({ 
                        user,
                        token: data.data?.accessToken || data.accessToken, 
                        refreshToken: data.data?.refreshToken || data.refreshToken,
                        loading: false,
                        isAdmin:    user?.role === 'admin',
                        isExaminer: user?.role === 'examiner',
                        isStudent:  user?.role === 'student',
                    });
                    return user;
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            register: async (formData) => {
                set({ loading: true });
                try {
                    const { data } = await authAPI.register(formData);
                    const user = data.data?.user || data.user;
                    set({ 
                        user,
                        token: data.data?.accessToken || data.accessToken, 
                        refreshToken: data.data?.refreshToken || data.refreshToken,
                        loading: false,
                        isAdmin:    user?.role === 'admin',
                        isExaminer: user?.role === 'examiner',
                        isStudent:  user?.role === 'student',
                    });
                    return user;
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            getMe: async () => {
                try {
                    const { data } = await authAPI.getMe();
                    const user = data.data?.user || data.user;
                    set({
                        user,
                        isAdmin:    user?.role === 'admin',
                        isExaminer: user?.role === 'examiner',
                        isStudent:  user?.role === 'student',
                    });
                } catch (error) {
                    set({ user: null, token: null, refreshToken: null, isAdmin: false, isExaminer: false, isStudent: false });
                }
            },

            updateProfile: async (data) => {
                const { data: resData } = await authAPI.updateProfile(data);
                const updatedUser = resData.data?.user || resData.user;
                set(state => ({
                    user: { ...state.user, ...updatedUser }
                }));
                return updatedUser;
            },
        }),
        {
            name: 'hawkwatch-auth',
            // Only persist auth tokens and user, not loading state
            partialize: (state) => ({
                user:         state.user,
                token:        state.token,
                refreshToken: state.refreshToken,
            }),
            // Rehydrate role booleans after load from localStorage
            onRehydrateStorage: () => (state) => {
                if (state?.user) {
                    state.isAdmin    = state.user.role === 'admin';
                    state.isExaminer = state.user.role === 'examiner';
                    state.isStudent  = state.user.role === 'student';
                }
            },
        }
    )
);

export default useAuthStore;
