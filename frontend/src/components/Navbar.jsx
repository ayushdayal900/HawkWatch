import { Bell, Search, X, Check, User, Settings, LogOut, Calendar, ShieldCheck } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_NOTIFICATIONS = [
    { id: 1, text: 'Neural analysis for "Physics 101" complete.', time: '2m ago', read: false },
    { id: 2, text: 'System security update deployed.', time: '15m ago', read: false },
    { id: 3, text: 'Session report #842 validated.', time: '1h ago', read: true },
];

export default function Navbar({ title = 'Dashboard' }) {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const [showNotifs, setShowNotifs] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    const notifRef = useRef(null);
    const profileRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.read).length;

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
        position: 'absolute', top: 'calc(100% + 12px)', right: 0,
        background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-xl)', zIndex: 1000, minWidth: 320,
        overflow: 'hidden', animation: 'fade-up 0.2s ease-out'
    };

    return (
        <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '2.5rem', paddingBottom: '1.25rem',
            borderBottom: '1px solid var(--border)',
        }}>
            {/* Title & Context */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-900)', margin: 0, letterSpacing: '-0.03em' }}>
                        {title}
                    </h1>
                    <div className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>SECURE SESSION</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--n-400)', fontSize: '0.8rem', fontWeight: 600 }}>
                    <Calendar size={14} />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Global Search */}
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                    <input
                        className="input"
                        placeholder="Search system..."
                        style={{ paddingLeft: '2.75rem', width: 240, height: '2.5rem', fontSize: '0.875rem' }}
                    />
                </div>

                {/* Notifications */}
                <div ref={notifRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => { setShowNotifs(v => !v); setShowProfile(false); }}
                        style={{
                            width: 42, height: 42, borderRadius: 12, border: '1px solid var(--border)',
                            background: showNotifs ? 'var(--brand-50)' : '#fff', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative', transition: 'all 0.2s',
                        }}
                    >
                        <Bell size={18} color={showNotifs ? 'var(--brand-600)' : 'var(--n-500)'} />
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: -4, right: -4,
                                minWidth: 18, height: 18, borderRadius: 9,
                                background: 'var(--danger)', color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifs && (
                        <div style={DROPDOWN_STYLE}>
                            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--n-50)' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--n-900)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Alerts</span>
                                <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: 'var(--brand-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Check size={14} /> Clear All
                                </button>
                            </div>
                            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                                {notifications.map(n => (
                                    <div key={n.id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--n-50)', display: 'flex', gap: '1rem', background: n.read ? '#fff' : 'var(--brand-50)', transition: 'background 0.2s' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? 'var(--n-200)' : 'var(--brand-500)', flexShrink: 0, marginTop: 6 }} />
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--n-800)', lineHeight: 1.5, fontWeight: n.read ? 400 : 600 }}>{n.text}</p>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--n-400)', marginTop: 4, display: 'block' }}>{n.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {notifications.length === 0 && (
                                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--n-400)', fontSize: '0.875rem' }}>No active alerts</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Profile Dropdown */}
                <div ref={profileRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => { setShowProfile(v => !v); setShowNotifs(false); }}
                        style={{
                            width: 42, height: 42, borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', fontWeight: 800, color: '#fff',
                            cursor: 'pointer', flexShrink: 0,
                            boxShadow: showProfile ? '0 0 0 3px var(--brand-100)' : 'var(--shadow-sm)',
                            transition: 'all 0.2s',
                        }}
                    >
                        {user?.name?.[0]?.toUpperCase()}
                    </button>

                    {showProfile && (
                        <div style={DROPDOWN_STYLE}>
                            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--n-50)' }}>
                                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '1.1rem', flexShrink: 0 }}>
                                    {user?.name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--n-900)', letterSpacing: '-0.02em' }}>{user?.name}</p>
                                    <p style={{ margin: '2px 0', fontSize: '0.75rem', color: 'var(--n-500)' }}>{user?.email}</p>
                                    <div className="badge badge-info" style={{ fontSize: '0.6rem', marginTop: 4 }}>{user?.role?.toUpperCase()} ACCESS</div>
                                </div>
                            </div>
                            <div style={{ padding: '0.5rem' }}>
                                <button onClick={() => setShowProfile(false)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--n-700)', textAlign: 'left', borderRadius: 8, transition: 'background 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--n-50)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                    <User size={16} color="var(--n-400)" /> Account Settings
                                </button>
                                <button onClick={() => setShowProfile(false)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--n-700)', textAlign: 'left', borderRadius: 8, transition: 'background 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--n-50)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                    <ShieldCheck size={16} color="var(--n-400)" /> Security Log
                                </button>
                                <div style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }} />
                                <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--danger)', fontWeight: 700, textAlign: 'left', borderRadius: 8, transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--danger)'; }}>
                                    <LogOut size={16} /> Terminate Session
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
