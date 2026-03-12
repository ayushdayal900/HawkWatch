import { Bell, Search, X, Check, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_NOTIFICATIONS = [
    { id: 1, text: 'New exam "Data Structures" is now live.', time: '2m ago', read: false },
    { id: 2, text: 'Your exam session was recorded.', time: '15m ago', read: false },
    { id: 3, text: 'Admin approved your proctor report.', time: '1h ago', read: true },
];

export default function Navbar({ title = 'Dashboard' }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [showNotifs, setShowNotifs] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    const notifRef = useRef(null);
    const profileRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClick = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const markAllRead = () => setNotifications(n => n.map(x => ({ ...x, read: true })));

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const DROPDOWN_STYLE = {
        position: 'absolute', top: 'calc(100% + 10px)', right: 0,
        background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 1000, minWidth: 280,
        overflow: 'hidden',
    };

    return (
        <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '2rem', paddingBottom: '1.25rem',
            borderBottom: '1px solid #E2E8F0',
        }}>
            {/* Title */}
            <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', margin: 0, letterSpacing: '-0.01em' }}>
                    {title}
                </h1>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '0.2rem 0 0' }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                        className="input"
                        placeholder="Search…"
                        style={{ paddingLeft: '2rem', width: 200, fontSize: '0.82rem', padding: '0.5rem 0.75rem 0.5rem 2rem' }}
                    />
                </div>

                {/* Notification bell */}
                <div ref={notifRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => { setShowNotifs(v => !v); setShowProfile(false); }}
                        style={{
                            width: 36, height: 36, borderRadius: '50%', border: '1px solid #E2E8F0',
                            background: showNotifs ? '#EFF6FF' : '#fff', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative', transition: 'all 0.15s',
                        }}
                    >
                        <Bell size={17} color={showNotifs ? '#3B82F6' : '#64748B'} />
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: 5, right: 5,
                                width: 8, height: 8, borderRadius: '50%',
                                background: '#EF4444', border: '1.5px solid #fff',
                            }} />
                        )}
                    </button>

                    {showNotifs && (
                        <div style={DROPDOWN_STYLE}>
                            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1E293B' }}>Notifications</span>
                                <button onClick={markAllRead} style={{ fontSize: '0.72rem', color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                    <Check size={11} style={{ marginRight: 3 }} />Mark all read
                                </button>
                            </div>
                            {notifications.map(n => (
                                <div key={n.id} style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #F8FAFC', display: 'flex', gap: '0.6rem', background: n.read ? '#fff' : '#F8FAFF' }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.read ? '#CBD5E1' : '#3B82F6', flexShrink: 0, marginTop: 5 }} />
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', lineHeight: 1.5 }}>{n.text}</p>
                                        <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{n.time}</span>
                                    </div>
                                </div>
                            ))}
                            {notifications.length === 0 && (
                                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>No notifications</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Profile avatar */}
                <div ref={profileRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => { setShowProfile(v => !v); setShowNotifs(false); }}
                        style={{
                            width: 36, height: 36, borderRadius: '50%', border: 'none',
                            background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.875rem', fontWeight: 700, color: '#fff',
                            cursor: 'pointer', flexShrink: 0,
                            outline: showProfile ? '2px solid #3B82F6' : 'none',
                            outlineOffset: 2,
                        }}
                    >
                        {user?.name?.[0]?.toUpperCase()}
                    </button>

                    {showProfile && (
                        <div style={DROPDOWN_STYLE}>
                            {/* User info */}
                            <div style={{ padding: '1rem', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#3B82F6,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '1rem', flexShrink: 0 }}>
                                    {user?.name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#1E293B' }}>{user?.name}</p>
                                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>{user?.email}</p>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#DBEAFE', color: '#1D4ED8', padding: '1px 7px', borderRadius: 99 }}>{user?.role?.toUpperCase()}</span>
                                </div>
                            </div>
                            {/* Menu items */}
                            <button onClick={() => setShowProfile(false)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#334155', textAlign: 'left' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                <User size={15} color="#64748B" /> Profile
                            </button>
                            <button onClick={() => setShowProfile(false)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#334155', textAlign: 'left' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                <Settings size={15} color="#64748B" /> Settings
                            </button>
                            <div style={{ borderTop: '1px solid #F1F5F9' }}>
                                <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#EF4444', textAlign: 'left', transition: 'background 0.1s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                    <LogOut size={15} /> Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
