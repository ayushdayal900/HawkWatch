import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { BarChart3, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ResultsPage() {
    const { isStudent } = useAuth();

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <Navbar title="Results" />
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                        <Trophy size={24} color="#8B5CF6" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                            {isStudent ? 'My Results' : 'Exam Reports'}
                        </h2>
                    </div>

                    <div className="card animate-fade-up" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <div style={{ display: 'inline-flex', padding: '1rem', background: '#F5F3FF', borderRadius: '50%', marginBottom: '1rem' }}>
                            <BarChart3 size={32} color="#8B5CF6" />
                        </div>
                        <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem', color: '#334155' }}>No Results Yet</h3>
                        <p style={{ color: '#94A3B8', margin: 0, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
                            {isStudent
                                ? 'Your exam results will appear here after you complete and submit an exam.'
                                : 'Submitted exam results and analytics will be available here once students begin taking exams.'}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
