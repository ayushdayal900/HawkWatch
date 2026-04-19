import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { CameraOff, Camera, Loader2, AlertTriangle } from 'lucide-react';

const WebcamCapture = forwardRef(({ onStreamActive, onStreamError, width = 640, height = 480, frameRate = 15, autoStart = true }, ref) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [status, setStatus] = useState(autoStart ? 'requesting' : 'idle');

    useImperativeHandle(ref, () => ({
        startCamera: async () => await startCam(),
        stopCamera: () => stopCam(),
        getVideoElement: () => videoRef.current,
    }));

    const stopCam = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setStatus('idle');
    };

    const startCam = async () => {
        try {
            setStatus('requesting');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width, height, frameRate },
                audio: true 
            });
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setStatus('active');
            onStreamActive?.(stream);
        } catch (err) {
            console.error('Camera access error:', err);
            setStatus('denied');
            onStreamError?.(err);
        }
    };

    useEffect(() => {
        if (autoStart) {
            startCam();
        }
        return () => stopCam();
    }, [autoStart]);

    return (
        <div className="webcam-capture-container" style={{ position: 'relative', width: '100%', aspectRatio: '4/3', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover', 
                    display: status === 'active' ? 'block' : 'none' 
                }} 
            />

            {status === 'requesting' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                    <Loader2 size={32} className="animate-spin" style={{ marginBottom: '1rem' }} />
                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Requesting Camera Access...</p>
                </div>
            )}

            {status === 'denied' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: '1rem', textAlign: 'center' }}>
                    <CameraOff size={32} color="#EF4444" style={{ marginBottom: '0.75rem' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#991B1B', marginBottom: '0.25rem' }}>Camera Access Denied</span>
                    <span style={{ fontSize: '0.75rem', color: '#B91C1C' }}>Please allow camera access in your browser to continue.</span>
                    <button onClick={startCam} className="btn btn-primary" style={{ marginTop: '1rem', fontSize: '0.75rem', padding: '0.5rem 1rem' }}>
                        Retry Access
                    </button>
                </div>
            )}
            
            {status === 'idle' && !autoStart && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B', color: '#fff' }}>
                    <Camera size={32} style={{ marginBottom: '0.75rem', opacity: 0.8 }} />
                    <button onClick={startCam} className="btn btn-primary">Start Camera</button>
                </div>
            )}
        </div>
    );
});

WebcamCapture.displayName = 'WebcamCapture';

export default WebcamCapture;
