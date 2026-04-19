import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import useAuthStore from './store/authStore';

// Lazy loaded pages
const LandingPage          = lazy(() => import('./pages/LandingPage'));
const LoginPage            = lazy(() => import('./pages/LoginPage'));
const RegisterPage         = lazy(() => import('./pages/RegisterPage'));
const DashboardPage        = lazy(() => import('./pages/DashboardPage'));
const ExamListPage         = lazy(() => import('./pages/ExamListPage'));
const ExamRoomPage         = lazy(() => import('./pages/ExamRoomPage'));
const CreateExam           = lazy(() => import('./pages/CreateExam'));
const StudentExamPage      = lazy(() => import('./pages/StudentExamPage'));
const MonitoringPage       = lazy(() => import('./pages/MonitoringPage'));
const ResultsPage          = lazy(() => import('./pages/ResultsPage'));
const ExamVerification     = lazy(() => import('./pages/ExamVerification'));
const AdminPage            = lazy(() => import('./pages/AdminPage'));
const ProctoringReportPage = lazy(() => import('./pages/ProctoringReportPage'));
const SettingsPage         = lazy(() => import('./pages/SettingsPage'));

const Loader = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#060a12',
    }}>
        <div style={{
            width: 40, height: 40,
            border: '4px solid #10b981',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

export default function App() {
    const getMe = useAuthStore((state) => state.getMe);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        if (token) {
            getMe();
        }
    }, [token, getMe]);

    return (
        <BrowserRouter>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background:   '#111a30',
                        color:        '#e2e8f0',
                        border:       '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        fontSize:     '0.875rem',
                        fontFamily:   'Inter, system-ui, sans-serif',
                    },
                    success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                    error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }}
            />

            <ErrorBoundary>
                <Suspense fallback={<Loader />}>
                    <Routes>
                        {/* ── Public ─────────────────────────────────────── */}
                        <Route path="/"         element={<LandingPage  />} />
                        <Route path="/login"    element={<LoginPage    />} />
                        <Route path="/register" element={<RegisterPage />} />

                        {/* ── Protected — all authenticated roles ─────────── */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/dashboard"              element={<DashboardPage        />} />
                            <Route path="/settings"               element={<SettingsPage         />} />
                            <Route path="/exams"                  element={<ExamListPage         />} />
                            <Route path="/create-exam"            element={<CreateExam           />} />
                            <Route path="/exams/:id"              element={<ExamRoomPage         />} />
                            <Route path="/student-exam/:id"       element={<StudentExamPage      />} />
                            <Route path="/results"                element={<ResultsPage          />} />
                            <Route path="/results/:attemptId"     element={<ResultsPage          />} />
                            <Route path="/monitoring"             element={<MonitoringPage       />} />
                            <Route path="/proctoring"             element={<MonitoringPage       />} />
                            <Route path="/exam-verification/:id"  element={<ExamVerification     />} />
                            <Route path="/proctor-report/:id"     element={<ProctoringReportPage />} />
                        </Route>

                        {/* ── Admin-only routes ────────────────────────────── */}
                        <Route element={<ProtectedRoute allowedRoles={['admin', 'examiner']} />}>
                            <Route path="/admin" element={<AdminPage />} />
                        </Route>

                        {/* ── Fallback ─────────────────────────────────────── */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </ErrorBoundary>
        </BrowserRouter>
    );
}
