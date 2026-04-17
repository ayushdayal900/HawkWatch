import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, BookOpen, Shield, BarChart3,
    Users, Settings, LogOut, Eye, Plus,
} from 'lucide-react';

const C = {
    bg: '#1E293B',
    bgHover: '#0F172A',
    active: '#3B82F6',
    activeBg: 'rgba(59,130,246,0.15)',
    text: 'rgba(255,255,255,0.55)',
    textHover: 'rgba(255,255,255,0.90)',
    border: 'rgba(255,255,255,0.08)',
};

const navItems = {
    student: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/exams',     icon: BookOpen,         label: 'My Exams'  },
        { to: '/results',   icon: BarChart3,        label: 'Results'   },
    ],
    examiner: [
        { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'       },
        { to: '/create-exam', icon: Plus,            label: 'Create Exam'     },
        { to: '/exams',       icon: BookOpen,        label: 'Manage Exams'    },
        { to: '/monitoring',  icon: Eye,             label: 'Monitor Sessions'},
    ],
    admin: [
        { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'       },
        { to: '/create-exam', icon: Plus,            label: 'Create Exam'     },
        { to: '/exams',       icon: BookOpen,        label: 'Manage Exams'    },
        { to: '/monitoring',  icon: Eye,             label: 'Monitor Sessions'},
        { to: '/results',     icon: BarChart3,       label: 'Reports'         },
        { to: '/admin',       icon: Users,           label: 'User Management' },
        { to: '/settings',    icon: Settings,        label: 'Settings'        },
    ],
};

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const items = navItems[user?.role] || navItems.student;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div style={{
                padding: '1.4rem 1.25rem',
                borderBottom: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', gap: '0.7rem',
            }}>
                <div style={{
                    width: 34, height: 34,
                    background: '#3B82F6',
                    borderRadius: 9,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Eye size={17} color="#fff" />
                </div>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC', letterSpacing: '-0.01em' }}>
                    HawkWatch
                </span>
            </div>

            {/* User badge */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '0.68rem', color: C.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
                    Signed in as
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9' }}>{user?.name}</div>
                <span style={{
                    display: 'inline-block', marginTop: '0.4rem',
                    background: 'rgba(59,130,246,0.2)', color: '#93C5FD',
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
                    padding: '0.2rem 0.55rem', borderRadius: 999,
                }}>
                    {user?.role?.toUpperCase()}
                </span>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.65rem', color: C.text, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.25rem 0.5rem', marginBottom: '0.25rem' }}>
                    Menu
                </div>
                {/* eslint-disable-next-line no-unused-vars */}
                {items.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.7rem',
                            padding: '0.6rem 0.75rem',
                            borderRadius: 8,
                            fontSize: '0.875rem',
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? '#FFFFFF' : C.text,
                            background: isActive ? C.activeBg : 'transparent',
                            borderLeft: isActive ? `3px solid ${C.active}` : '3px solid transparent',
                            textDecoration: 'none',
                            transition: 'all 0.15s',
                        })}
                    >
                        <Icon size={16} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div style={{ padding: '1rem 0.75rem', borderTop: `1px solid ${C.border}` }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.7rem',
                        padding: '0.6rem 0.75rem', borderRadius: 8, border: 'none',
                        background: 'transparent', color: C.text, fontSize: '0.875rem',
                        cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#FCA5A5'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.text; }}
                >
                    <LogOut size={16} /> Sign Out
                </button>
            </div>
        </aside>
    );
}
