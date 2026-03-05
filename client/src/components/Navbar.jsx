import { Bell, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ title = 'Dashboard' }) {
    const { user } = useAuth();
    return (
        <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '2rem',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid #E2E8F0',
        }}>
            <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', margin: 0, letterSpacing: '-0.01em' }}>
                    {title}
                </h1>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '0.2rem 0 0' }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                        className="input"
                        placeholder="Search…"
                        style={{ paddingLeft: '2rem', width: 200, fontSize: '0.82rem', padding: '0.5rem 0.75rem 0.5rem 2rem' }}
                    />
                </div>

                {/* Notifications */}
                <button className="btn-secondary" style={{ padding: '0.5rem', position: 'relative' }}>
                    <Bell size={17} />
                    <span style={{
                        position: 'absolute', top: 5, right: 5,
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#EF4444',
                    }} />
                </button>

                {/* Avatar */}
                <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.875rem', fontWeight: 700, color: '#fff', cursor: 'pointer',
                    flexShrink: 0,
                }}>
                    {user?.name?.[0]?.toUpperCase()}
                </div>
            </div>
        </header>
    );
}
