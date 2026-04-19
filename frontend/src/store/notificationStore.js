import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useNotificationStore = create(
    persist(
        (set, get) => ({
            notifications: [],
            
            addNotification: (text) => set(state => {
                const newNotif = {
                    id: Date.now() + Math.random(),
                    text,
                    time: new Date().toISOString(),
                    read: false
                };
                return { notifications: [newNotif, ...state.notifications] };
            }),
            
            markAllRead: () => set(state => ({
                notifications: state.notifications.map(n => ({ ...n, read: true }))
            })),
            
            clearAll: () => set({ notifications: [] }),
            
            // Utility to format time
            getTimeAgo: (isoString) => {
                const seconds = Math.floor((new Date() - new Date(isoString)) / 1000);
                let interval = seconds / 31536000;
                if (interval > 1) return Math.floor(interval) + "y ago";
                interval = seconds / 2592000;
                if (interval > 1) return Math.floor(interval) + "mo ago";
                interval = seconds / 86400;
                if (interval > 1) return Math.floor(interval) + "d ago";
                interval = seconds / 3600;
                if (interval > 1) return Math.floor(interval) + "h ago";
                interval = seconds / 60;
                if (interval > 1) return Math.floor(interval) + "m ago";
                return "Just now";
            }
        }),
        {
            name: 'hawkwatch-notifications',
        }
    )
);

export default useNotificationStore;
