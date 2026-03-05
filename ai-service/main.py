"""
HawkWatch — AI Proctoring Microservice
=======================================
Stack: Python 3.11, FastAPI, MediaPipe, OpenCV, PyTorch

Endpoints
---------
POST /analyze-frame      — Face detection, head pose, gaze, deepfake
POST /verify-face        — Identity verification (ArcFace embedding)
POST /detect-deepfake    — Deepfake classification (EfficientNet)
POST /analyze-behavior   — Behavioral biometrics anomaly detection

Run:
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import base64
import io
import os

import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── App Setup ───────────────────────────────────────────────
app = FastAPI(title="HawkWatch AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("AI_SERVICE_API_KEY", "")

# ─── MediaPipe Setup ──────────────────────────────────────────
mp_face_detection = mp.solutions.face_detection
mp_face_mesh      = mp.solutions.face_mesh

face_detector  = mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)
face_mesh      = mp_face_mesh.FaceMesh(
    static_image_mode=False, max_num_faces=2,
    refine_landmarks=True, min_detection_confidence=0.5
)

# ─── Models ──────────────────────────────────────────────────
class FrameRequest(BaseModel):
    frame_b64: str
    session_id: str

class BehaviorRequest(BaseModel):
    typing: dict
    mouse: dict
    baseline: dict | None = None

class FaceVerifyRequest(BaseModel):
    frame_b64: str
    embedding: list[float]

# ─── Helpers ─────────────────────────────────────────────────
def decode_frame(b64: str) -> np.ndarray:
    """Decode base64 JPEG/PNG to OpenCV BGR array."""
    data = base64.b64decode(b64)
    img  = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image data")
    return img

def estimate_head_pose(landmarks, img_shape):
    """
    Estimate Euler angles (pitch, yaw, roll) using OpenCV solvePnP
    with a simplified 3D face model.
    """
    h, w = img_shape[:2]
    # 6-point 3D reference model (nose, chin, L/R eye corners, L/R mouth corners)
    model_pts = np.array([
        (0.0, 0.0, 0.0),        # Nose tip
        (0.0, -330.0, -65.0),   # Chin
        (-225.0, 170.0, -135.0),# Left eye corner
        (225.0, 170.0, -135.0), # Right eye corner
        (-150.0, -150.0, -125.0),# Left mouth corner
        (150.0, -150.0, -125.0), # Right mouth corner
    ], dtype=np.float64)

    # Corresponding MediaPipe landmark indices
    idx = [1, 152, 33, 263, 61, 291]
    pts = []
    for i in idx:
        lm = landmarks.landmark[i]
        pts.append((lm.x * w, lm.y * h))
    img_pts = np.array(pts, dtype=np.float64)

    focal   = w
    cam_mtx = np.array([[focal, 0, w/2], [0, focal, h/2], [0, 0, 1]], dtype=np.float64)
    _, rvec, tvec = cv2.solvePnP(model_pts, img_pts, cam_mtx, np.zeros((4,1)),
                                  flags=cv2.SOLVEPNP_ITERATIVE)
    rot_mat, _ = cv2.Rodrigues(rvec)
    euler = cv2.RQDecomp3x3(rot_mat)[0]
    return {"pitch": round(euler[0], 2), "yaw": round(euler[1], 2), "roll": round(euler[2], 2)}


def deepfake_score_stub(img: np.ndarray) -> float:
    """
    Placeholder for EfficientNet deepfake classifier.
    Replace with: model.predict(preprocess(img)) after loading weights.
    """
    # TODO: load model once at startup
    # model = torch.load("weights/deepfake_effnet.pth")
    return 0.04  # stub: real face


def check_gaze_deviation(landmarks, threshold=0.35) -> bool:
    """
    Rough gaze check: compare horizontal iris position relative to eye corners.
    """
    try:
        l_iris  = landmarks.landmark[468]   # left iris center
        l_inner = landmarks.landmark[133]   # left eye inner corner
        l_outer = landmarks.landmark[33]    # left eye outer corner
        eye_w   = abs(l_inner.x - l_outer.x)
        if eye_w == 0:
            return False
        rel_pos = (l_iris.x - l_outer.x) / eye_w
        return rel_pos < threshold or rel_pos > (1 - threshold)
    except Exception:
        return False

# ─── Routes ──────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "HawkWatch AI Service"}


@app.post("/analyze-frame")
async def analyze_frame(req: FrameRequest, x_api_key: str = Header(default="")):
    img     = decode_frame(req.frame_b64)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Face detection
    det_result = face_detector.process(rgb_img)
    face_count = len(det_result.detections) if det_result.detections else 0
    face_detected  = face_count > 0
    multiple_faces = face_count > 1
    face_conf      = float(det_result.detections[0].score[0]) if face_detected else 0.0

    # Face mesh + head pose + gaze
    head_pose       = {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}
    gaze_deviation  = False
    gaze_vector     = {"x": 0.0, "y": 0.0}

    if face_detected:
        mesh_result = face_mesh.process(rgb_img)
        if mesh_result.multi_face_landmarks:
            lms          = mesh_result.multi_face_landmarks[0]
            head_pose    = estimate_head_pose(lms, img.shape)
            gaze_deviation = check_gaze_deviation(lms)

    # Deepfake detection
    df_score = deepfake_score_stub(img)

    return {
        "faceDetected":   face_detected,
        "faceCount":      face_count,
        "multipleFaces":  multiple_faces,
        "faceConfidence": round(face_conf, 4),
        "headPose":       head_pose,
        "gazeVector":     gaze_vector,
        "gazeDeviation":  gaze_deviation,
        "deepfakeScore":  round(df_score, 4),
        "deepfakeDetected": df_score > 0.6,
        "phoneDetected":  False,   # TODO: YOLO object detection
        "personAbsent":   not face_detected,
        "processingMs":   0,
    }


@app.post("/verify-face")
async def verify_face(req: FaceVerifyRequest):
    """
    ArcFace-based identity verification.
    Compare live frame embedding with enrolled vector (cosine similarity).
    """
    # TODO: extract embedding from frame using InsightFace ArcFace
    # live_embedding = arcface_model.get(decode_frame(req.frame_b64))
    # sim = cosine_similarity(live_embedding, req.embedding)
    sim = 0.93  # stub
    return {"match": sim > 0.75, "similarity": sim, "confidence": sim}


@app.post("/detect-deepfake")
async def detect_deepfake(req: FrameRequest):
    img   = decode_frame(req.frame_b64)
    score = deepfake_score_stub(img)
    return {"score": score, "isDeepfake": score > 0.6}


@app.post("/analyze-behavior")
async def analyze_behavior(req: BehaviorRequest):
    """
    Behavioral biometrics anomaly detection.
    Production: compare typingRhythm / mouseDynamics against stored baseline
    using a One-Class SVM or Autoencoder trained on enrollment data.
    """
    typing_score = 0.08   # stub — replace with model inference
    mouse_score  = 0.11
    overall      = (typing_score + mouse_score) / 2
    return {
        "typing":  round(typing_score, 4),
        "mouse":   round(mouse_score, 4),
        "overall": round(overall, 4),
    }
