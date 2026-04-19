import { create } from 'zustand';

let _toastId = 0;

const useUIStore = create((set, get) => ({
    // Global loading overlay
    loading: false,
    loadingMessage: '',

    // Theme
    theme: 'light',

    // Camera permission state
    cameraPermission: null,

    // Page context
    pageTitle: 'Dashboard',

    // Global toast notifications queue
    toasts: [],

    // Sidebar state
    sidebarOpen: false,

    // Actions
    setPageTitle: (pageTitle) => set({ pageTitle }),
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setLoading: (loading, message = '') => set({ loading, loadingMessage: message }),
    setTheme: (theme) => set({ theme }),
    setCameraPermission: (status) => set({ cameraPermission: status }),

    // Toast system
    addToast: (message, type = 'info', duration = 4000) => {
        const id = ++_toastId;
        set((state) => ({
            toasts: [...state.toasts, { id, message, type, duration }]
        }));
        // Auto-remove after duration
        setTimeout(() => {
            get().removeToast(id);
        }, duration);
        return id;
    },
    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
    })),

    // Convenience helpers
    toastSuccess: (message, duration) => get().addToast(message, 'success', duration),
    toastError:   (message, duration) => get().addToast(message, 'error', duration),
    toastWarning: (message, duration) => get().addToast(message, 'warning', duration),
    toastInfo:    (message, duration) => get().addToast(message, 'info', duration),

    // Modal management
    openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
    closeModal: () => set({ activeModal: null, modalData: null }),
}));

export default useUIStore;
