import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import {
    LayoutDashboard, BookOpen, Shield, BarChart3,
    Users, Settings, LogOut, Eye, Plus, Activity,
    ChevronRight, X
} from 'lucide-react';
import useUIStore from '../store/uiStore';

const navItems = {
    student: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',  group: 'main' },
        { to: '/exams',     icon: BookOpen,         label: 'My Exams',   group: 'main' },
        { to: '/results',   icon: BarChart3,        label: 'Results',    group: 'main' },
    ],
    examiner: [
        { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',        group: 'main' },
        { to: '/exams',       icon: BookOpen,        label: 'Manage Exams',     group: 'exams' },
        { to: '/create-exam', icon: Plus,            label: 'Create Exam',      group: 'exams' },
        { to: '/monitoring',  icon: Activity,        label: 'Live Monitor',     group: 'proctor' },
        { to: '/results',     icon: BarChart3,       label: 'Reports',          group: 'proctor' },
        { to: '/admin',       icon: Users,           label: 'Organizations',    group: 'admin' },
    ],
    admin: [
        { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',        group: 'main' },
        { to: '/exams',       icon: BookOpen,        label: 'Manage Exams',     group: 'exams' },
        { to: '/create-exam', icon: Plus,            label: 'Create Exam',      group: 'exams' },
        { to: '/monitoring',  icon: Activity,        label: 'Live Monitor',     group: 'proctor' },
        { to: '/results',     icon: BarChart3,       label: 'Reports',          group: 'proctor' },
        { to: '/admin',       icon: Users,           label: 'Organizations',    group: 'admin' },
    ],
};

const groupLabels = {
    main:    null,
    exams:   'Exams',
    proctor: 'Proctoring',
    admin:   'Administration',
};

function NavGroup({ label, children }) {
    return (
        <div style={{ marginBottom: '0.5rem' }}>
            {label && (
                <div style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.25)',
                    padding: '0.75rem 0.875rem 0.25rem',
                }}>
                    {label}
                </div>
            )}
            {children}
        </div>
    );
}

export default function Sidebar() {
    const { user, logout, isAdmin, isExaminer } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { sidebarOpen, setSidebarOpen } = useUIStore();
    
    // Auto-close on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname, setSidebarOpen]);

    const items = navItems[user?.role] || navItems.student;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Group items
    const groups = {};
    items.forEach(item => {
        if (!groups[item.group]) groups[item.group] = [];
        groups[item.group].push(item);
    });

    const roleColor = isAdmin ? '#F59E0B' : isExaminer ? '#A78BFA' : '#34D399';
    const roleLabel = user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1);
    const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';

    return (
        <>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div 
                    className="sidebar-overlay show-mobile" 
                    onClick={() => setSidebarOpen(false)} 
                />
            )}

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                {/* Mobile Close Button */}
                <button 
                    className="show-mobile"
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'absolute', top: 20, right: 12,
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(255,255,255,0.4)', cursor: 'pointer', zIndex: 10
                    }}
                >
                    <X size={20} />
                </button>
            {/* Logo */}
            <div style={{
                padding: '1.75rem 1.25rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: '0.875rem',
            }}>
                <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-700) 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, boxShadow: '0 8px 20px rgba(59,130,246,0.3)',
                }}>
                    <Eye size={22} color="#fff" strokeWidth={2.5} />
                </div>
                <div>
                    <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                        HawkWatch<span style={{ color: 'var(--brand-400)' }}>.</span>
                    </div>
                </div>
            </div>

            {/* User info */}
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #334155, #475569)',
                        border: `2px solid ${roleColor}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.82rem', fontWeight: 700, color: '#F1F5F9',
                        flexShrink: 0,
                    }}>
                        {initials}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                            fontSize: '0.84rem', fontWeight: 600,
                            color: '#F1F5F9', lineHeight: 1.2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {user?.name}
                        </div>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            marginTop: 3, fontSize: '0.62rem', fontWeight: 700,
                            color: roleColor, letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: roleColor, display: 'inline-block' }} />
                            {roleLabel}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.75rem' }}>
                {Object.entries(groups).map(([group, groupItems]) => (
                    <NavGroup key={group} label={groupLabels[group]}>
                        {groupItems.map(({ to, icon: Icon, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.65rem 1rem',
                                    borderRadius: 10,
                                    fontSize: '0.875rem',
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
                                    background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                                    boxShadow: isActive ? 'inset 0 0 0 1px rgba(255,255,255,0.05)' : 'none',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    marginBottom: 4,
                                })}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0, color: isActive ? 'var(--brand-400)' : 'inherit' }} />
                                        <span style={{ flex: 1 }}>{label}</span>
                                        {isActive && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--brand-400)', boxShadow: '0 0 8px var(--brand-400)' }} />}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </NavGroup>
                ))}
            </nav>

            {/* Bottom: logout */}
            <div style={{ padding: '0.75rem 0.625rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
                        padding: '0.55rem 0.875rem', borderRadius: 8, border: 'none',
                        background: 'transparent', color: 'rgba(255,255,255,0.4)',
                        fontSize: '0.875rem', cursor: 'pointer',
                        transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                        e.currentTarget.style.color = '#FCA5A5';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                    }}
                >
                    <LogOut size={15} />
                    Sign Out
                </button>
            </div>
        </aside>
        </>
    );
}
