import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertTriangle, CheckCircle, Activity, Eye } from 'lucide-react';
import { proctoringAPI } from '../services/api';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const FRAME_INTERVAL_MS = 5000;

// Placeholder functions for local detection
// eslint-disable-next-line no-unused-vars
const detectFacePresence = (_frame) => {
    // Placeholder logic — replace with real ML model
    return true;
};

// eslint-disable-next-line no-unused-vars
const detectMultipleFaces = (_frame) => {
    // Placeholder logic — replace with real ML model
    return false;
};

const flagSeverityStyle = {
    low: { background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' },
    medium: { background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' },
    high: { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' },
    critical: { background: '#FEF2F2', color: '#DC2626', border: '1px solid #EF4444', fontWeight: 700 },
};

export default function ProctoringOverlay({ sessionId, examId, onSessionTerminated }) {
    const { user } = useAuth();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);

    const [camStatus, setCamStatus] = useState('requesting');
    const [alerts, setAlerts] = useState([]);
    const [riskScore, setRiskScore] = useState(0);
    const [faceDetected, setFaceDetected] = useState(true);
    const [deepfakeScore, setDeepfakeScore] = useState(0);
    const [framesAnalyzed, setFramesAnalyzed] = useState(0);
    const [tabSwitches, setTabSwitches] = useState(0);

    // ── Tracking util ────────────────────────────────
    const trackEvent = useCallback((eventType) => {
        if (!examId || !user?._id) return;
        api.post('/proctor/event', {
            studentId: user._id,
            examId,
            eventType,
            timestamp: new Date().toISOString()
        }).catch(() => {});
    }, [examId, user]);

    // ── Camera ───────────────────────────────────────
    useEffect(() => {
        const startCam = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                setCamStatus('active');
            } catch {
                setCamStatus('denied');
                if (sessionId) proctoringAPI.flagEvent(sessionId, { type: 'face_not_detected', severity: 'critical', confidence: 1.0 });
            }
        };
        startCam();
        return () => streamRef.current?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Frame capture ────────────────────────────────
    const captureAndAnalyze = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !sessionId) return;
        const c = canvasRef.current;
        const v = videoRef.current;
        c.width = v.videoWidth || 640;
        c.height = v.videoHeight || 480;
        c.getContext('2d').drawImage(v, 0, 0);
        const frameB64 = c.toDataURL('image/jpeg', 0.7).split(',')[1];
        const hasFace = detectFacePresence(frameB64);
        const multipleFaces = detectMultipleFaces(frameB64);

        if (!hasFace) {
            trackEvent('FACE_MISSING');
            setAlerts((p) => [{ id: Date.now(), text: 'Face not detected', severity: 'critical' }, ...p].slice(0, 8));
        }

        if (multipleFaces) {
            trackEvent('MULTIPLE_FACES');
            setAlerts((p) => [{ id: Date.now(), text: 'Multiple faces detected', severity: 'high' }, ...p].slice(0, 8));
        }

        try {
            const { data } = await proctoringAPI.analyzeFrame(sessionId, frameB64);
            const r = data.result;
            setFaceDetected(r.faceDetected ?? hasFace);
            setDeepfakeScore(r.deepfakeScore ?? 0);
            setFramesAnalyzed((n) => n + 1);
            setRiskScore(data.riskScore ?? 0);

            if (data.flagsGenerated > 0) {
                const sev = r.deepfakeScore > 0.6 ? 'critical' : r.multipleFaces ? 'high' : 'medium';
                setAlerts((p) => [{ id: Date.now(), text: `Flag: ${data.flagsGenerated} event(s) detected`, severity: sev }, ...p].slice(0, 8));
            }
            if (data.terminated) onSessionTerminated?.('Exceeded flag threshold');
        } catch { /* network issue — continue */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, onSessionTerminated]);

    useEffect(() => {
        if (camStatus !== 'active' || !sessionId) return;
        intervalRef.current = setInterval(captureAndAnalyze, FRAME_INTERVAL_MS);
        return () => clearInterval(intervalRef.current);
    }, [camStatus, sessionId, captureAndAnalyze]);

    // ── Behavioral Monitoring ────────────────────────

    // 1. Tab switch
    useEffect(() => {
        const handle = () => {
            if (document.hidden) {
                setTabSwitches((n) => n + 1);
                trackEvent('TAB_SWITCH');
                if (sessionId) proctoringAPI.flagEvent(sessionId, { type: 'tab_switch', severity: 'high', confidence: 1.0 });
                setAlerts((p) => [{ id: Date.now(), text: 'Tab switch detected', severity: 'high' }, ...p].slice(0, 8));
            }
        };
        document.addEventListener('visibilitychange', handle);
        return () => document.removeEventListener('visibilitychange', handle);
    }, [sessionId, trackEvent]);

    // 2. Inactivity (> 15s)
    useEffect(() => {
        let lastActivity = Date.now();
        const updateActivity = () => { lastActivity = Date.now(); };
        
        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);

        const checkInactivity = setInterval(() => {
            if (Date.now() - lastActivity > 15000) {
                trackEvent('INACTIVITY');
                setAlerts((p) => [{ id: Date.now(), text: 'Inactivity detected', severity: 'medium' }, ...p].slice(0, 8));
                updateActivity(); // reset after logging
            }
        }, 5000);

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            clearInterval(checkInactivity);
        };
    }, [trackEvent]);

    // 3 & 4. Keystroke timing & Mouse movement frequency
    useEffect(() => {
        let lastKeyTime = Date.now();
        let lastMouseTime = Date.now();

        const handleKeyDown = () => {
            const now = Date.now();
            const interval = now - lastKeyTime; // measured keystroke interval
            if (interval > 500) { // Throttle sending to backend to avoid flooding API
                trackEvent('KEYSTROKE_TIMING');
                lastKeyTime = now;
            }
        };

        const handleMouseMove = () => {
            const now = Date.now();
            const interval = now - lastMouseTime; // measured mouse movement frequency
            if (interval > 2000) { // Throttle sending to backend to avoid flooding API
                trackEvent('MOUSE_MOVEMENT');
                lastMouseTime = now;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [trackEvent]);

    // ── Block right-click & copy/paste ──────────────
    useEffect(() => {
        const block = (e) => {
            e.preventDefault();
            if (sessionId) proctoringAPI.flagEvent(sessionId, { type: 'copy_paste', severity: 'medium', confidence: 1.0 });
        };
        document.addEventListener('contextmenu', block);
        document.addEventListener('copy', block);
        document.addEventListener('paste', block);
        return () => {
            document.removeEventListener('contextmenu', block);
            document.removeEventListener('copy', block);
            document.removeEventListener('paste', block);
        };
    }, [sessionId]);

    const riskColor = riskScore >= 75 ? '#DC2626' : riskScore >= 50 ? '#D97706' : riskScore >= 25 ? '#F59E0B' : '#22C55E';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
            {/* Webcam */}
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#1E293B', aspectRatio: '4/3' }}>
                <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* REC dot */}
                <div style={{
                    position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: '3px 9px'
                }}>
                    <span className="recording-ring">
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', display: 'block' }} />
                    </span>
                    <span style={{ color: '#fff', fontSize: '0.67rem', fontWeight: 700 }}>REC</span>
                </div>

                {/* Face status pill */}
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    {camStatus === 'active' ? (
                        faceDetected
                            ? <span style={{ background: 'rgba(34,197,94,0.85)', borderRadius: 20, padding: '3px 9px', color: '#fff', fontSize: '0.67rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={10} /> Face OK
                            </span>
                            : <span style={{ background: 'rgba(239,68,68,0.85)', borderRadius: 20, padding: '3px 9px', color: '#fff', fontSize: '0.67rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={10} /> No Face
                            </span>
                    ) : (
                        <span style={{ background: 'rgba(239,68,68,0.85)', borderRadius: 20, padding: '3px 9px', color: '#fff', fontSize: '0.67rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CameraOff size={10} /> Cam Off
                        </span>
                    )}
                </div>

                {/* Camera denied overlay */}
                {camStatus === 'denied' && (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', background: 'rgba(30,41,59,0.92)'
                    }}>
                        <CameraOff size={28} color="#EF4444" />
                        <p style={{ color: '#FCA5A5', marginTop: 8, textAlign: 'center', padding: '0 1rem', fontSize: '0.78rem' }}>
                            Camera access denied.<br />Enable webcam to continue.
                        </p>
                    </div>
                )}
            </div>

            {/* Metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {/* Risk score */}
                <div className="card" style={{ padding: '0.7rem' }}>
                    <div style={{ fontSize: '0.62rem', color: '#94A3B8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Risk Score</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: riskColor, lineHeight: 1 }}>{riskScore}</div>
                    <div style={{ height: 3, background: '#E2E8F0', borderRadius: 2, marginTop: 5 }}>
                        <div style={{ width: `${riskScore}%`, height: '100%', background: riskColor, borderRadius: 2, transition: 'width 0.5s' }} />
                    </div>
                </div>

                {/* Deepfake */}
                <div className="card" style={{ padding: '0.7rem' }}>
                    <div style={{ fontSize: '0.62rem', color: '#94A3B8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Deepfake</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: deepfakeScore > 0.5 ? '#DC2626' : '#22C55E', lineHeight: 1 }}>
                        {(deepfakeScore * 100).toFixed(0)}%
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#94A3B8', marginTop: 3 }}>
                        {framesAnalyzed} frames · {tabSwitches} switches
                    </div>
                </div>
            </div>

            {/* Alert log */}
            <div className="card" style={{ padding: '0.75rem', maxHeight: 175, overflowY: 'auto' }}>
                <div style={{
                    fontSize: '0.62rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em',
                    marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600
                }}>
                    <Activity size={10} /> Proctoring Log
                </div>
                {alerts.length === 0 ? (
                    <div style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>No alerts — session clean ✓</div>
                ) : alerts.map((a) => (
                    <div key={a.id} style={{ ...flagSeverityStyle[a.severity], borderRadius: 6, padding: '4px 8px', marginBottom: 4, fontSize: '0.72rem' }}>
                        {a.text}
                    </div>
                ))}
            </div>
        </div>
    );
}
