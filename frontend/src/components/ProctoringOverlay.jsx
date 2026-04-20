import { useEffect, useRef, useState, useCallback } from 'react';
import { CameraOff, AlertTriangle, CheckCircle, Activity, ShieldCheck, Eye, Video, VideoOff } from 'lucide-react';
import { proctoringAPI } from '../services/api';
import useProctoringStore from '../store/proctoringStore';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';
import { socketService } from '../services/socket';
import WebcamCapture from './exam/WebcamCapture';

const FRAME_INTERVAL_MS = 2000;
const BEHAVIORAL_INTERVAL_MS = 60000;

const SEVERITY_CONFIG = {
    low:      { color: '#10B981', bg: '#ECFDF5' },
    medium:   { color: '#F59E0B', bg: '#FFFBEB' },
    high:     { color: '#F97316', bg: '#FFF7ED' },
    critical: { color: '#EF4444', bg: '#FEF2F2' },
};

export default function ProctoringOverlay({ sessionId, examId, onSessionTerminated }) {
    const webcamRef      = useRef(null);
    const canvasRef      = useRef(null);
    const previewVideoRef = useRef(null); // Separate ref for the self-preview bubble
    const lastCamState   = useRef(true);
    const frameCount     = useRef(0);
    const mediaStreamRef = useRef(null);  // Stores the active MediaStream for preview

    const token           = useAuthStore(s => s.token);
    const connectSocket   = useProctoringStore(s => s.connectSocket);
    const disconnectSocket = useProctoringStore(s => s.disconnectSocket);
    const socket          = useProctoringStore(s => s.socket);
    const storeFlags      = useProctoringStore(s => s.flags);
    const storeRiskScore  = useProctoringStore(s => s.riskScore);
    const setRiskScore    = useProctoringStore(s => s.setRiskScore);
    const addFlag         = useProctoringStore(s => s.addFlag);

    const [camStatus,    setCamStatus]    = useState('requesting');
    const [faceDetected, setFaceDetected] = useState(true);
    const [minimized,    setMinimized]    = useState(false);
    // Self-preview: default OFF so student sees clean exam, can turn ON anytime
    const [showSelfPreview, setShowSelfPreview] = useState(false);

    // ── Socket setup ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (token && sessionId) {
            connectSocket(token, 'student', sessionId);
            socketService.connect(token);
            socketService.joinSession(sessionId, 'student');
            
            // Notify dashboard of session start
            socketService.getSocket()?.emit('session_start', { sessionId });
        }
        return () => {
            disconnectSocket();
            socketService.disconnect();
        };
    }, [token, sessionId, connectSocket, disconnectSocket]);

    // ── Flag dispatcher ──────────────────────────────────────────────────────────
    const dispatchFlag = useCallback((flagPayload) => {
        if (!sessionId) return;
        proctoringAPI.flagEvent(sessionId, flagPayload).then(res => {
            if (res.data?.riskScore) setRiskScore(res.data.riskScore);
            if (res.data?.riskScore > 75) onSessionTerminated?.();
        }).catch(() => {});
        if (socket) socket.emit('proctor-event', { sessionId, eventType: flagPayload.type, data: flagPayload });
        socketService.reportCheating(sessionId, flagPayload);

        const flagType = flagPayload.type || 'security_event';
        const flagText = String(flagType).replace(/_/g, ' ');
        addFlag({ id: Date.now() + Math.random(), text: flagText, severity: flagPayload.severity });

        if (flagPayload.severity === 'high' || flagPayload.severity === 'critical') {
            useNotificationStore.getState().addNotification(`Security Warning: ${flagText} detected during exam session.`);
        }
    }, [sessionId, onSessionTerminated, socket, setRiskScore, addFlag]);

    // ── Camera stream handlers ───────────────────────────────────────────────────
    const handleStreamActive = useCallback((stream) => {
        setCamStatus('active');
        mediaStreamRef.current = stream; // Always save the stream
        // If the preview bubble is already visible, attach immediately
        if (previewVideoRef.current && stream) {
            previewVideoRef.current.srcObject = stream;
        }
    }, []);

    // When the student toggles ON the preview AFTER the stream is already active
    useEffect(() => {
        if (showSelfPreview && previewVideoRef.current && mediaStreamRef.current) {
            previewVideoRef.current.srcObject = mediaStreamRef.current;
        }
    }, [showSelfPreview]);

    const handleStreamError = useCallback(() => {
        setCamStatus('denied');
        dispatchFlag({ type: 'camera_blocked', severity: 'critical', confidence: 1.0 });
    }, [dispatchFlag]);

    // ── Frame capture & streaming ────────────────────────────────────────────────
    const captureAndAnalyze = useCallback(async () => {
        const videoElement = webcamRef.current?.getVideoElement();
        if (!videoElement || !canvasRef.current || !sessionId) return;

        // Camera state monitoring
        const stream = videoElement.srcObject;
        const isCamOn = !!(stream && stream.active && stream.getVideoTracks().some(t => t.enabled && t.readyState === 'live'));

        if (isCamOn !== lastCamState.current) {
            lastCamState.current = isCamOn;
            if (socket) {
                socket.emit('proctoring_event', {
                    type: isCamOn ? 'CAMERA_ON' : 'CAMERA_OFF',
                    severity: isCamOn ? 'LOW' : 'HIGH',
                    timestamp: Date.now(),
                    sessionId
                });
            }
        }

        if (videoElement.videoWidth === 0) return;

        const c = canvasRef.current;
        c.width  = videoElement.videoWidth;
        c.height = videoElement.videoHeight;
        c.getContext('2d').drawImage(videoElement, 0, 0);
        const frameB64 = c.toDataURL('image/jpeg', 0.4).split(',')[1];

        // Stream frame to admin (always, regardless of student's self-preview choice)
        if (socket) {
            socket.emit('video_frame', { sessionId, examId, frame: frameB64 });
        }

        // AI analysis every 2nd frame
        frameCount.current += 1;
        if (frameCount.current % 2 !== 0) return;

        try {
            const { data } = await proctoringAPI.analyzeFrame(sessionId, frameB64);
            if (data.result) setFaceDetected(data.result.faceDetected ?? true);
            if (data.riskScore) {
                setRiskScore(data.riskScore);
                if (data.riskScore > 75) onSessionTerminated?.('Exceeded flag threshold');
            }
            if (data.flagsGenerated > 0 && data.flags) {
                data.flags.forEach(flag => {
                    const flagText = String(flag.type || '').replace(/_/g, ' ');
                    addFlag({ id: Date.now() + Math.random(), text: flagText, severity: flag.severity });
                    if (flag.severity === 'high' || flag.severity === 'critical') {
                        useNotificationStore.getState().addNotification(`Security Alert: AI detected suspicious activity: ${flagText}`);
                    }
                });
            }
        } catch { /* non-fatal */ }
    }, [sessionId, examId, onSessionTerminated, socket, setRiskScore, addFlag]);

    useEffect(() => {
        if (camStatus !== 'active' || !sessionId) return;
        const interval = setInterval(captureAndAnalyze, FRAME_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [camStatus, sessionId, captureAndAnalyze]);

    // ── Tab/focus detection ──────────────────────────────────────────────────────
    useEffect(() => {
        const handleVis  = () => { if (document.hidden) dispatchFlag({ type: 'tab_switch', severity: 'high', confidence: 1.0 }); };
        const handleBlur = () => dispatchFlag({ type: 'window_blur', severity: 'medium', confidence: 1.0 });
        document.addEventListener('visibilitychange', handleVis);
        window.addEventListener('blur', handleBlur);
        return () => { document.removeEventListener('visibilitychange', handleVis); window.removeEventListener('blur', handleBlur); };
    }, [dispatchFlag]);

    // ── Fullscreen ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const h = () => { if (!document.fullscreenElement) dispatchFlag({ type: 'fullscreen_exit', severity: 'high', confidence: 1.0 }); };
        document.addEventListener('fullscreenchange', h);
        return () => document.removeEventListener('fullscreenchange', h);
    }, [dispatchFlag]);

    // ── Copy/paste/keys ──────────────────────────────────────────────────────────
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

    // ── Behavioral biometrics ────────────────────────────────────────────────────
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

    const riskColor  = storeRiskScore >= 75 ? '#EF4444' : storeRiskScore >= 50 ? '#F97316' : storeRiskScore >= 25 ? '#F59E0B' : '#10B981';
    const recentFlags = storeFlags.slice(0, 4);

    return (
        <>
            {/* ── Hidden canvas for frame capture (always rendered) ── */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* ── Hidden WebcamCapture — always runs, never visible directly ── */}
            <div style={{ display: 'none' }}>
                <WebcamCapture
                    ref={webcamRef}
                    onStreamActive={handleStreamActive}
                    onStreamError={handleStreamError}
                />
            </div>

            {/* ── Self-preview floating bubble (student toggle) ── */}
            {showSelfPreview && (
                <div style={{
                    position: 'fixed',
                    bottom: '6rem',
                    left: '1.5rem',
                    width: 160,
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#0F172A',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    border: '2px solid rgba(255,255,255,0.12)',
                    zIndex: 9998,
                }}>
                    <video
                        ref={previewVideoRef}
                        autoPlay
                        muted
                        playsInline
                        style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                        position: 'absolute', top: 6, left: 6,
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: 'rgba(0,0,0,0.6)', borderRadius: 99, padding: '2px 6px'
                    }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444', display: 'block', animation: 'blink 1.2s infinite' }} />
                        <span style={{ fontSize: '0.55rem', color: '#fff', fontWeight: 700 }}>YOU</span>
                    </div>
                    <button
                        onClick={() => setShowSelfPreview(false)}
                        style={{
                            position: 'absolute', top: 4, right: 4,
                            background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff',
                            borderRadius: '50%', width: 20, height: 20, cursor: 'pointer',
                            fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >✕</button>
                </div>
            )}

            {/* ── Minimized pill ── */}
            {minimized ? (
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
            ) : (
                /* ── Main proctoring widget ── */
                <div className="proctor-widget" style={{ fontFamily: 'Inter, sans-serif' }}>

                    {/* Status bar (no camera feed here — the widget is pure status) */}
                    <div style={{
                        background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10, padding: '0.5rem 0.75rem',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        {/* REC dot */}
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0, animation: 'blink 1s infinite' }} />
                        <span style={{ fontSize: '0.62rem', color: '#fff', fontWeight: 700, letterSpacing: '0.06em', flex: 1 }}>PROCTORING ACTIVE</span>

                        {/* Camera status icon */}
                        {camStatus === 'active'
                            ? <CheckCircle size={12} color="#10B981" />
                            : <CameraOff size={12} color="#EF4444" />
                        }

                        {/* Toggle self-preview */}
                        <button
                            onClick={() => setShowSelfPreview(p => !p)}
                            title={showSelfPreview ? 'Hide your camera preview' : 'Show your camera preview'}
                            style={{
                                background: showSelfPreview ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.08)',
                                border: showSelfPreview ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                color: showSelfPreview ? '#93C5FD' : 'rgba(255,255,255,0.6)',
                                borderRadius: 6, padding: '2px 6px',
                                fontSize: '0.55rem', cursor: 'pointer', fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: 3,
                            }}
                        >
                            {showSelfPreview ? <VideoOff size={10} /> : <Video size={10} />}
                            {showSelfPreview ? 'HIDE CAM' : 'PREVIEW'}
                        </button>

                        <button
                            onClick={() => setMinimized(true)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.7rem', padding: '0 2px' }}
                        >—</button>
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

                        {/* Face detection status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: '0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '4px 8px' }}>
                            {faceDetected
                                ? <><CheckCircle size={11} color="#10B981" /><span style={{ fontSize: '0.65rem', color: '#10B981', fontWeight: 600 }}>Face Detected</span></>
                                : <><AlertTriangle size={11} color="#F59E0B" /><span style={{ fontSize: '0.65rem', color: '#F59E0B', fontWeight: 600 }}>No Face Visible</span></>
                            }
                        </div>

                        {/* Flag log */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: '0.4rem' }}>
                            <Activity size={11} color="rgba(255,255,255,0.35)" />
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                Alerts ({storeFlags.length})
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 90, overflowY: 'auto' }}>
                            {recentFlags.length === 0 ? (
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Monitoring cleanly ✓</div>
                            ) : recentFlags.map(flag => {
                                const cfg = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.medium;
                                return (
                                    <div key={flag.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${cfg.color}18`, borderRadius: 5, padding: '4px 7px' }}>
                                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.68rem', color: cfg.color, fontWeight: 600, textTransform: 'capitalize', flex: 1 }}>{flag.text}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
                </div>
            )}
        </>
    );
}
