import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage    from './pages/LandingPage';
import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';
import DashboardPage  from './pages/DashboardPage';
import ExamListPage   from './pages/ExamListPage';
import ExamRoomPage   from './pages/ExamRoomPage';
import CreateExam     from './pages/CreateExam';
import StudentExamPage   from './pages/StudentExamPage';
import MonitoringPage    from './pages/MonitoringPage';
import ResultsPage       from './pages/ResultsPage';
import ExamVerification  from './pages/ExamVerification';

export default function App() {
    return (
        <AuthProvider>
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

                <Routes>
                    {/* ── Public ─────────────────────────────────────── */}
                    <Route path="/"         element={<LandingPage  />} />
                    <Route path="/login"    element={<LoginPage    />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* ── Protected — all authenticated roles ─────────── */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard"              element={<DashboardPage    />} />
                        <Route path="/exams"                  element={<ExamListPage     />} />
                        <Route path="/create-exam"            element={<CreateExam       />} />
                        <Route path="/exams/:id"              element={<ExamRoomPage     />} />
                        <Route path="/student-exam/:id"       element={<StudentExamPage  />} />
                        <Route path="/results"                element={<ResultsPage      />} />
                        <Route path="/monitoring"             element={<MonitoringPage   />} />
                        <Route path="/proctoring"             element={<MonitoringPage   />} />
                        <Route path="/exam-verification/:id"  element={<ExamVerification />} />
                    </Route>

                    {/* ── Admin-only routes ────────────────────────────── */}
                    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                        {/* <Route path="/admin" element={<AdminPage />} /> */}
                    </Route>

                    {/* ── Examiner + Admin only ────────────────────────── */}
                    <Route element={<ProtectedRoute allowedRoles={['examiner', 'admin']} />}>
                        {/* <Route path="/reports" element={<ReportsPage />} /> */}
                    </Route>

                    {/* ── Fallback ─────────────────────────────────────── */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

