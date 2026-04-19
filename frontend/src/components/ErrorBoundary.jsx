import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary
 * ─────────────────────────────────────────────────────────────────
 * Catches runtime React render errors and shows a graceful fallback
 * instead of a blank white screen.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/dashboard';
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F8FAFC',
                fontFamily: 'Inter, system-ui, sans-serif',
                gap: '1.25rem',
                padding: '2rem',
                textAlign: 'center',
            }}>
                <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: '#FEF2F2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <AlertTriangle size={28} color="#EF4444" />
                </div>

                <div>
                    <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: 700, color: '#1E293B' }}>
                        Something went wrong
                    </h1>
                    <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem', maxWidth: 420 }}>
                        An unexpected error occurred in the application. Your session data is safe.
                    </p>
                </div>

                {this.state.error && (
                    <details style={{
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        padding: '0.75rem 1rem',
                        maxWidth: 560,
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                    }}>
                        <summary style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                            Error details
                        </summary>
                        <pre style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#DC2626', overflowX: 'auto' }}>
                            {this.state.error?.message}
                        </pre>
                    </details>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={this.handleReset}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: '#3B82F6', color: '#fff',
                            border: 'none', borderRadius: 8,
                            padding: '0.65rem 1.25rem', fontWeight: 600, fontSize: '0.875rem',
                            cursor: 'pointer',
                        }}
                    >
                        <RefreshCw size={15} /> Go to Dashboard
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'transparent', color: '#64748B',
                            border: '1px solid #E2E8F0', borderRadius: 8,
                            padding: '0.65rem 1.25rem', fontWeight: 600, fontSize: '0.875rem',
                            cursor: 'pointer',
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }
}
