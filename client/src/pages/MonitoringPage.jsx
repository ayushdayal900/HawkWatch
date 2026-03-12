import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { Activity, ShieldAlert } from 'lucide-react';

export default function MonitoringPage() {
    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <Navbar title="Monitoring" />
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                        <ShieldAlert size={24} color="#3B82F6" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>Live Proctoring Monitor</h2>
                    </div>

                    <div className="card animate-fade-up" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <div style={{ display: 'inline-flex', padding: '1rem', background: '#EFF6FF', borderRadius: '50%', marginBottom: '1rem' }}>
                            <Activity size={32} color="#3B82F6" />
                        </div>
                        <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem', color: '#334155' }}>Monitoring Dashboard</h3>
                        <p style={{ color: '#94A3B8', margin: 0, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
                            Real-time proctoring data is displayed on the main Dashboard under the <strong>Live Monitor</strong> section when an active exam session is running.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
