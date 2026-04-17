import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { proctoringAPI } from '../services/api';
import { io } from 'socket.io-client';

const FRAME_INTERVAL_MS = 5000;
const BEHAVIORAL_INTERVAL_MS = 60000;

const flagSeverityStyle = {
    low: { background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' },
    medium: { background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' },
    high: { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' },
    critical: { background: '#FEF2F2', color: '#DC2626', border: '1px solid #EF4444', fontWeight: 700 },
};

export default function ProctoringOverlay({ sessionId, examId, onSessionTerminated }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const socketRef = useRef(null);

    const [camStatus, setCamStatus] = useState('requesting');
    const [alerts, setAlerts] = useState([]);
    const [riskScore, setRiskScore] = useState(0);
    const [faceDetected, setFaceDetected] = useState(true);
    const [deepfakeScore, setDeepfakeScore] = useState(0);
    const [framesAnalyzed, setFramesAnalyzed] = useState(0);
    const [tabSwitches, setTabSwitches] = useState(0);

    // ── Socket.IO Connection ─────────────────────────
    useEffect(() => {
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
        socketRef.current = socket;
        if (sessionId) {
            socket.emit('join-session', { sessionId });
        }
        return () => {
            socket.disconnect();
        };
    }, [sessionId]);

    const dispatchFlag = useCallback((flagPayload) => {
        if (!sessionId) return;
        proctoringAPI.flagEvent(sessionId, flagPayload).then((res) => {
            if (res.data?.riskScore > 75) {
                onSessionTerminated?.();
            }
        }).catch(() => {});
        if (socketRef.current) {
            socketRef.current.emit('proctor-event', {
                sessionId,
                eventType: flagPayload.type,
                data: flagPayload
            });
        }
        setAlerts(p => [{ id: Date.now() + Math.random(), text: `${flagPayload.type} detected`, severity: flagPayload.severity }, ...p].slice(0, 5));
    }, [sessionId, onSessionTerminated]);

    // ── Camera ───────────────────────────────────────
    useEffect(() => {
        const startCam = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, frameRate: 15 }, audio: true });
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                setCamStatus('active');
            } catch {
                setCamStatus('denied');
                dispatchFlag({ type: 'face_not_detected', severity: 'critical', confidence: 1.0 });
            }
        };
        startCam();
        return () => streamRef.current?.getTracks().forEach((t) => t.stop());
    }, [dispatchFlag]);

    // ── Frame capture ────────────────────────────────
    const captureAndAnalyze = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !sessionId) return;
        const c = canvasRef.current;
        const v = videoRef.current;
        if (v.videoWidth === 0) return;
        
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        c.getContext('2d').drawImage(v, 0, 0);
        const frameB64 = c.toDataURL('image/jpeg', 0.7).split(',')[1];

        try {
            const { data } = await proctoringAPI.analyzeFrame(sessionId, frameB64);
            const r = data.result;
            if (r) {
                setFaceDetected(r.faceDetected);
                setDeepfakeScore(r.deepfakeScore ?? 0);
            }
            setFramesAnalyzed((n) => n + 1);
            if (data.riskScore) {
                setRiskScore(data.riskScore);
                if (data.riskScore > 75) onSessionTerminated?.('Exceeded flag threshold');
            }

            if (data.flagsGenerated > 0) {
                const sev = (r && r.deepfakeScore > 0.6) ? 'critical' : (r && r.multipleFaces) ? 'high' : 'medium';
                setAlerts((p) => [{ id: Date.now(), text: `Flag: ${data.flagsGenerated} AI event(s) detected`, severity: sev }, ...p].slice(0, 5));
            }
        } catch { /* network issue — continue */ }
    }, [sessionId, onSessionTerminated]);

    useEffect(() => {
        if (camStatus !== 'active' || !sessionId) return;
        const interval = setInterval(captureAndAnalyze, FRAME_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [camStatus, sessionId, captureAndAnalyze]);


    // ── Tab switch & Window focus ────────────────────
    useEffect(() => {
        const handleVis = () => {
            if (document.hidden) {
                setTabSwitches((n) => {
                    const next = n + 1;
                    if (next > 3) dispatchFlag({ type: 'tab_switch', severity: 'critical', confidence: 1.0 }); // Adjust to logic later if needed
                    return next;
                });
                dispatchFlag({ type: 'tab_switch', severity: 'high', confidence: 1.0 });
            }
        };
        const handleBlur = () => {
            dispatchFlag({ type: 'tab_switch', severity: 'high', confidence: 1.0 });
        };
        document.addEventListener('visibilitychange', handleVis);
        window.addEventListener('blur', handleBlur);
        return () => {
            document.removeEventListener('visibilitychange', handleVis);
            window.removeEventListener('blur', handleBlur);
        };
    }, [dispatchFlag]);

    // ── Fullscreen enforcement ───────────────────────
    useEffect(() => {
        document.documentElement.requestFullscreen().catch(() => {});
        const handleFC = () => {
            if (!document.fullscreenElement) {
                dispatchFlag({ type: 'fullscreen_exit', severity: 'high', confidence: 1.0 });
            }
        };
        document.addEventListener('fullscreenchange', handleFC);
        return () => document.removeEventListener('fullscreenchange', handleFC);
    }, [dispatchFlag]);

    // ── Copy/Paste & Keyboard Restrictions ───────────
    useEffect(() => {
        const blockEvent = (e) => {
            e.preventDefault();
            dispatchFlag({ type: 'copy_paste', severity: 'medium', confidence: 1.0 });
        };
        const blockKeys = (e) => {
            if (e.key === 'F12' || 
               (e.ctrlKey && ['c','v','a','C','V','A'].includes(e.key)) ||
               (e.ctrlKey && e.shiftKey && ['i','I'].includes(e.key))) {
                e.preventDefault();
                dispatchFlag({ type: 'keyboard_shortcut', severity: 'medium', confidence: 1.0 });
            }
        };
        
        document.addEventListener('copy', blockEvent);
        document.addEventListener('paste', blockEvent);
        document.addEventListener('keydown', blockKeys);
        return () => {
            document.removeEventListener('copy', blockEvent);
            document.removeEventListener('paste', blockEvent);
            document.removeEventListener('keydown', blockKeys);
        };
    }, [dispatchFlag]);

    // ── Behavioral Biometrics ────────────────────────
    const behaviorRef = useRef({
        dwellTimes: [],
        flightTimes: [],
        lastKeyDownMap: new Map(), // needed since hold down keys fire multiple keydowns
        lastKeyUpTime: null,
        mouseDistance: 0,
        mouseSpeeds: [],
        lastMousePos: null,
        lastMouseTime: null,
        mouseCurvature: 0
    });

    useEffect(() => {
        const handleKeyDown = (e) => {
            const now = Date.now();
            if (!behaviorRef.current.lastKeyDownMap.has(e.code)) {
                behaviorRef.current.lastKeyDownMap.set(e.code, now);
            }
            if (behaviorRef.current.lastKeyUpTime) {
                behaviorRef.current.flightTimes.push(now - behaviorRef.current.lastKeyUpTime);
            }
        };

        const handleKeyUp = (e) => {
            const now = Date.now();
            const downTime = behaviorRef.current.lastKeyDownMap.get(e.code);
            if (downTime) {
                behaviorRef.current.dwellTimes.push(now - downTime);
                behaviorRef.current.lastKeyDownMap.delete(e.code);
            }
            behaviorRef.current.lastKeyUpTime = now;
        };

        const handleMouseMove = (e) => {
            const now = Date.now();
            const { clientX, clientY } = e;
            const state = behaviorRef.current;
            if (state.lastMousePos) {
                const dx = clientX - state.lastMousePos.x;
                const dy = clientY - state.lastMousePos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                state.mouseDistance += dist;
                const dt = Math.max(1, now - state.lastMouseTime);
                state.mouseSpeeds.push(dist / dt);
                
                // pseudo-curvature as proxy
                state.mouseCurvature += Math.abs(dx * dy) > 0 ? 0.05 : 0;
            }
            state.lastMousePos = { x: clientX, y: clientY };
            state.lastMouseTime = now;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);

        const uploadId = setInterval(() => {
            const b = behaviorRef.current;
            const avgDwell = b.dwellTimes.length ? b.dwellTimes.reduce((x, y) => x + y, 0) / b.dwellTimes.length : 0;
            const avgFlight = b.flightTimes.length ? b.flightTimes.reduce((x, y) => x + y, 0) / b.flightTimes.length : 0;
            const avgSpeed = b.mouseSpeeds.length ? b.mouseSpeeds.reduce((x, y) => x + y, 0) / b.mouseSpeeds.length : 0;
            
            if (sessionId && (b.dwellTimes.length > 0 || b.mouseSpeeds.length > 0)) {
                proctoringAPI.updateBehavioral(sessionId, {
                    typingRhythm: {
                        avgDwellTime: avgDwell,
                        avgFlightTime: avgFlight,
                        keyPressCount: b.dwellTimes.length
                    },
                    mouseDynamics: {
                        avgSpeed,
                        curvatureIndex: b.mouseCurvature,
                        totalDistance: b.mouseDistance
                    }
                }).catch(() => {});
            }

            // clear buffer
            behaviorRef.current = {
                dwellTimes: [],
                flightTimes: [],
                lastKeyDownMap: new Map(),
                lastKeyUpTime: null,
                mouseDistance: 0,
                mouseSpeeds: [],
                lastMousePos: null,
                lastMouseTime: null,
                mouseCurvature: 0
            };

        }, BEHAVIORAL_INTERVAL_MS);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            clearInterval(uploadId);
        };
    }, [sessionId]);

    const riskColor = riskScore >= 75 ? '#DC2626' : riskScore >= 50 ? '#D97706' : riskScore >= 25 ? '#F59E0B' : '#22C55E';

    return (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', width: '280px', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem', zIndex: 9999 }}>
            
            {/* Camera denied banner */}
            {camStatus === 'denied' && (
                <div style={{ background: '#DC2626', color: '#fff', padding: '0.75rem', borderRadius: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CameraOff size={16} /> Camera required — exam cannot continue.
                </div>
            )}

            {/* Top row: Video + Risk */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                {/* Micro Webcam */}
                <div style={{ position: 'relative', width: 64, height: 48, borderRadius: 6, overflow: 'hidden', background: '#1E293B', flexShrink: 0 }}>
                    <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    
                    {camStatus === 'active' && (
                        <div style={{ position: 'absolute', bottom: 2, right: 2 }}>
                            {faceDetected ? <CheckCircle size={10} color="#22C55E" /> : <AlertTriangle size={10} color="#EF4444" />}
                        </div>
                    )}
                </div>

                {/* Risk score */}
                <div style={{ flex: 1, background: '#fff', padding: '0.5rem', borderRadius: 6, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.62rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Risk Score</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: riskColor, lineHeight: 1 }}>{Math.round(riskScore)}</span>
                        <span style={{ fontSize: '0.65rem', color: '#64748B' }}>/ 100</span>
                    </div>
                </div>
            </div>

            {/* Alert log */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, padding: '0.5rem', maxHeight: 150, overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '0.62rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <Activity size={10} /> Alerts ({alerts.length})
                </div>
                {alerts.length === 0 ? (
                    <div style={{ color: '#94A3B8', fontSize: '0.7rem' }}>Monitoring cleanly ✓</div>
                ) : alerts.map((a) => (
                    <div key={a.id} style={{ ...flagSeverityStyle[a.severity], borderRadius: 4, padding: '4px 6px', marginBottom: 4, fontSize: '0.7rem' }}>
                        {a.text}
                    </div>
                ))}
            </div>
        </div>
    );
}
