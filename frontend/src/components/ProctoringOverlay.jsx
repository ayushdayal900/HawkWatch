import { useEffect, useRef, useState, useCallback } from 'react';
import { CameraOff, AlertTriangle, CheckCircle, Activity, ShieldCheck, Eye } from 'lucide-react';
import { proctoringAPI } from '../services/api';
import useProctoringStore from '../store/proctoringStore';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';

const FRAME_INTERVAL_MS = 5000;
const BEHAVIORAL_INTERVAL_MS = 60000;

const SEVERITY_CONFIG = {
    low:      { color: '#10B981', bg: '#ECFDF5' },
    medium:   { color: '#F59E0B', bg: '#FFFBEB' },
    high:     { color: '#F97316', bg: '#FFF7ED' },
    critical: { color: '#EF4444', bg: '#FEF2F2' },
};

export default function ProctoringOverlay({ sessionId, examId, onSessionTerminated }) {
    const videoRef  = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const token          = useAuthStore(s => s.token);
    const connectSocket  = useProctoringStore(s => s.connectSocket);
    const disconnectSocket = useProctoringStore(s => s.disconnectSocket);
    const socket         = useProctoringStore(s => s.socket);
    const storeFlags     = useProctoringStore(s => s.flags);
    const storeRiskScore = useProctoringStore(s => s.riskScore);
    const setRiskScore   = useProctoringStore(s => s.setRiskScore);
    const addFlag        = useProctoringStore(s => s.addFlag);

    const [camStatus,   setCamStatus]   = useState('requesting');
    const [faceDetected, setFaceDetected] = useState(true);
    const [minimized,   setMinimized]   = useState(false);

    // Socket
    useEffect(() => {
        if (token && sessionId) connectSocket(token, 'student', sessionId);
        return () => disconnectSocket();
    }, [token, sessionId, connectSocket, disconnectSocket]);

    const dispatchFlag = useCallback((flagPayload) => {
        if (!sessionId) return;
        proctoringAPI.flagEvent(sessionId, flagPayload).then(res => {
            if (res.data?.riskScore) setRiskScore(res.data.riskScore);
            if (res.data?.riskScore > 75) onSessionTerminated?.();
        }).catch(() => {});
        if (socket) socket.emit('proctor-event', { sessionId, eventType: flagPayload.type, data: flagPayload });
        const flagText = String(flagPayload.type).replace(/_/g, ' ');
        addFlag({ id: Date.now() + Math.random(), text: flagText, severity: flagPayload.severity });

        if (flagPayload.severity === 'high' || flagPayload.severity === 'critical') {
            useNotificationStore.getState().addNotification(`Security Warning: ${flagText} detected during exam session.`);
        }
    }, [sessionId, onSessionTerminated, socket, setRiskScore, addFlag]);

    // Camera
    useEffect(() => {
        const startCam = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, frameRate: 15 }, audio: true });
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                setCamStatus('active');
            } catch {
                setCamStatus('denied');
                dispatchFlag({ type: 'camera_blocked', severity: 'critical', confidence: 1.0 });
            }
        };
        startCam();
        return () => streamRef.current?.getTracks().forEach(t => t.stop());
    }, [dispatchFlag]);

    // Frame analysis
    const captureAndAnalyze = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !sessionId) return;
        const v = videoRef.current, c = canvasRef.current;
        if (v.videoWidth === 0) return;
        c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext('2d').drawImage(v, 0, 0);
        const frameB64 = c.toDataURL('image/jpeg', 0.7).split(',')[1];
        try {
            const { data } = await proctoringAPI.analyzeFrame(sessionId, frameB64);
            if (data.result) setFaceDetected(data.result.faceDetected ?? true);
            if (data.riskScore) {
                setRiskScore(data.riskScore);
                if (data.riskScore > 75) onSessionTerminated?.('Exceeded flag threshold');
            }
            if (data.flagsGenerated > 0) {
                const r = data.result;
                const sev = (r?.deepfakeScore > 0.6) ? 'critical' : (r?.multipleFaces) ? 'high' : 'medium';
                const flagText = `${data.flagsGenerated} AI event(s) detected`;
                addFlag({ id: Date.now(), text: flagText, severity: sev });
                
                if (sev === 'high' || sev === 'critical') {
                    useNotificationStore.getState().addNotification(`Security Alert: AI detected suspicious activity: ${flagText}`);
                }
            }
        } catch { /* non-fatal */ }
    }, [sessionId, onSessionTerminated, setRiskScore, addFlag]);

    useEffect(() => {
        if (camStatus !== 'active' || !sessionId) return;
        const interval = setInterval(captureAndAnalyze, FRAME_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [camStatus, sessionId, captureAndAnalyze]);

    // Tab / focus detection
    useEffect(() => {
        const handleVis  = () => { if (document.hidden) dispatchFlag({ type: 'tab_switch', severity: 'high', confidence: 1.0 }); };
        const handleBlur = () => dispatchFlag({ type: 'window_blur', severity: 'medium', confidence: 1.0 });
        document.addEventListener('visibilitychange', handleVis);
        window.addEventListener('blur', handleBlur);
        return () => { document.removeEventListener('visibilitychange', handleVis); window.removeEventListener('blur', handleBlur); };
    }, [dispatchFlag]);

    // Fullscreen
    useEffect(() => {
        document.documentElement.requestFullscreen().catch(() => {});
        const h = () => { if (!document.fullscreenElement) dispatchFlag({ type: 'fullscreen_exit', severity: 'high', confidence: 1.0 }); };
        document.addEventListener('fullscreenchange', h);
        return () => document.removeEventListener('fullscreenchange', h);
    }, [dispatchFlag]);

    // Copy/paste/keys
    useEffect(() => {
        const block = e => { e.preventDefault(); dispatchFlag({ type: 'copy_paste', severity: 'medium', confidence: 1.0 }); };
        const blockKeys = e => {
            if (e.key === 'F12' || (e.ctrlKey && ['c','v','a','C','V','A'].includes(e.key)) || (e.ctrlKey && e.shiftKey && ['i','I'].includes(e.key))) {
                e.preventDefault();
                dispatchFlag({ type: 'dev_tools', severity: 'medium', confidence: 1.0 });
            }
        };
        document.addEventListener('copy', block);
        document.addEventListener('paste', block);
        document.addEventListener('keydown', blockKeys);
        return () => { document.removeEventListener('copy', block); document.removeEventListener('paste', block); document.removeEventListener('keydown', blockKeys); };
    }, [dispatchFlag]);

    // Behavioral biometrics
    const bRef = useRef({ dwellTimes: [], flightTimes: [], lastKeyDownMap: new Map(), lastKeyUpTime: null, mouseDistance: 0, mouseSpeeds: [], lastMousePos: null, lastMouseTime: null });
    useEffect(() => {
        const kd = e => {
            const now = Date.now();
            if (!bRef.current.lastKeyDownMap.has(e.code)) bRef.current.lastKeyDownMap.set(e.code, now);
            if (bRef.current.lastKeyUpTime) bRef.current.flightTimes.push(now - bRef.current.lastKeyUpTime);
        };
        const ku = e => {
            const now = Date.now(), d = bRef.current.lastKeyDownMap.get(e.code);
            if (d) { bRef.current.dwellTimes.push(now - d); bRef.current.lastKeyDownMap.delete(e.code); }
            bRef.current.lastKeyUpTime = now;
        };
        const mm = e => {
            const now = Date.now(), { clientX: x, clientY: y } = e, s = bRef.current;
            if (s.lastMousePos) {
                const dx = x - s.lastMousePos.x, dy = y - s.lastMousePos.y;
                s.mouseDistance += Math.sqrt(dx*dx + dy*dy);
                s.mouseSpeeds.push(Math.sqrt(dx*dx + dy*dy) / Math.max(1, now - s.lastMouseTime));
            }
            s.lastMousePos = { x, y }; s.lastMouseTime = now;
        };
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);
        window.addEventListener('mousemove', mm);
        const id = setInterval(() => {
            const b = bRef.current;
            const avg = arr => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0;
            if (sessionId && (b.dwellTimes.length > 0 || b.mouseSpeeds.length > 0)) {
                proctoringAPI.updateBehavioral(sessionId, {
                    typingRhythm: { avgDwellTime: avg(b.dwellTimes), avgFlightTime: avg(b.flightTimes), keyPressCount: b.dwellTimes.length },
                    mouseDynamics: { avgSpeed: avg(b.mouseSpeeds), totalDistance: b.mouseDistance },
                }).catch(() => {});
            }
            bRef.current = { dwellTimes: [], flightTimes: [], lastKeyDownMap: new Map(), lastKeyUpTime: null, mouseDistance: 0, mouseSpeeds: [], lastMousePos: null, lastMouseTime: null };
        }, BEHAVIORAL_INTERVAL_MS);
        return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('mousemove', mm); clearInterval(id); };
    }, [sessionId]);

    const riskColor = storeRiskScore >= 75 ? '#EF4444' : storeRiskScore >= 50 ? '#F97316' : storeRiskScore >= 25 ? '#F59E0B' : '#10B981';
    const recentFlags = storeFlags.slice(0, 4);

    if (minimized) {
        return (
            <div
                onClick={() => setMinimized(false)}
                style={{
                    position: 'fixed', bottom: '1.5rem', right: '1.5rem',
                    background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
                    borderRadius: 99, border: '1px solid rgba(255,255,255,0.12)',
                    padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s',
                }}
            >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: riskColor, animation: 'blink 1s infinite' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>Proctoring Active</span>
                <span style={{ fontSize: '0.7rem', color: riskColor, fontWeight: 700 }}>{Math.round(storeRiskScore)}</span>
                <Eye size={13} color="rgba(255,255,255,0.5)" />
            </div>
        );
    }

    return (
        <div className="proctor-widget" style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* Camera denied */}
            {camStatus === 'denied' && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CameraOff size={16} color="#EF4444" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#991B1B' }}>Camera required to continue.</span>
                </div>
            )}

            {/* Camera feed */}
            <div className="proctor-cam-wrap">
                <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover' }} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Face status overlay */}
                <div style={{ position: 'absolute', bottom: 6, left: 6, right: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', borderRadius: 99, padding: '3px 8px' }}>
                        {faceDetected
                            ? <><CheckCircle size={11} color="#10B981" /><span style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 600 }}>Face OK</span></>
                            : <><AlertTriangle size={11} color="#F59E0B" /><span style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 600 }}>No Face</span></>
                        }
                    </div>
                    <button
                        onClick={() => setMinimized(true)}
                        style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: 'rgba(255,255,255,0.7)', borderRadius: 99, padding: '2px 7px', fontSize: '0.62rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Minimize
                    </button>
                </div>

                {/* Recording indicator */}
                <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.55)', borderRadius: 99, padding: '2px 7px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'block', animation: 'blink 1s infinite' }} />
                    <span style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 700, letterSpacing: '0.05em' }}>REC</span>
                </div>
            </div>

            {/* Risk panel */}
            <div className="proctor-panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck size={13} color={riskColor} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Risk Score</span>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: riskColor, letterSpacing: '-0.03em' }}>
                        {Math.round(storeRiskScore)}<span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 600 }}>/100</span>
                    </span>
                </div>
                {/* Risk meter */}
                <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden', marginBottom: '0.75rem' }}>
                    <div style={{ height: '100%', width: `${Math.min(storeRiskScore, 100)}%`, background: riskColor, borderRadius: 99, transition: 'width 0.5s ease' }} />
                </div>

                {/* Flag log */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: '0.4rem' }}>
                    <Activity size={11} color="rgba(255,255,255,0.35)" />
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Alerts ({storeFlags.length})
                    </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 100, overflowY: 'auto' }}>
                    {recentFlags.length === 0 ? (
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Monitoring cleanly ✓</div>
                    ) : recentFlags.map(flag => {
                        const cfg = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.medium;
                        return (
                            <div key={flag.id} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: `${cfg.color}18`, borderRadius: 5, padding: '4px 7px',
                            }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.68rem', color: cfg.color, fontWeight: 600, textTransform: 'capitalize', flex: 1 }}>{flag.text}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        </div>
    );
}
