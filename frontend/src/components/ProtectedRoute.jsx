import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

/**
 * ProtectedRoute
 * ─────────────────────────────────────────────────────────────────────
 * Wraps any routes that require authentication.
 *
 * Props:
 *   allowedRoles  - string[]  Optional. If given, only users with one of
 *                             the listed roles can access the route.
 *                             Unauthenticated users → /login
 *                             Wrong role            → /dashboard
 *
 * Usage in App.jsx:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<DashboardPage />} />
 *   </Route>
 *
 *   <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
 *     <Route path="/admin" element={<AdminPage />} />
 *   </Route>
 * ─────────────────────────────────────────────────────────────────────
 */
export default function ProtectedRoute({ allowedRoles }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    /* ── Loading state — token validation on mount ─────────────────── */
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F8FAFC',
                gap: '1.25rem',
            }}>
                {/* Animated logo */}
                <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(30,41,59,0.18)',
                    animation: 'pulse 1.8s ease-in-out infinite',
                }}>
                    <ShieldCheck size={26} color="#3B82F6" />
                </div>

                {/* Progress bar */}
                <div style={{
                    width: 180,
                    height: 3,
                    background: '#E2E8F0',
                    borderRadius: 99,
                    overflow: 'hidden',
                }}>
                    <div style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #3B82F6, #6366F1)',
                        borderRadius: 99,
                        animation: 'loader-slide 1.4s ease-in-out infinite',
                    }} />
                </div>

                <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0 }}>
                    Verifying session…
                </p>

                <style>{`
                    @keyframes loader-slide {
                        0%   { width: 0%;   margin-left: 0; }
                        50%  { width: 70%;  margin-left: 15%; }
                        100% { width: 0%;   margin-left: 100%; }
                    }
                    @keyframes pulse {
                        0%, 100% { transform: scale(1);    opacity: 1; }
                        50%       { transform: scale(1.07); opacity: 0.85; }
                    }
                `}</style>
            </div>
        );
    }

    /* ── Not authenticated → remember where they were going ────────── */
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    /* ── Wrong role → back to dashboard ────────────────────────────── */
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
