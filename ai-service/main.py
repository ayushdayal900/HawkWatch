import os
import base64
import io
import math
import numpy as np
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from PIL import Image

try:
    import torch
    import torchvision.transforms as transforms
except ImportError:
    torch = None

try:
    from insightface.app import FaceAnalysis
except ImportError:
    FaceAnalysis = None

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

app = FastAPI(title="HawkWatch AI Microservice")

# ---------- Globals & Models ----------
DEEPFAKE_MODEL_PATH = os.environ.get("DEEPFAKE_MODEL_PATH", "efficientnet_b4.pt")
deepfake_model = None
device = torch.device('cuda' if torch and torch.cuda.is_alive() else 'cpu') if torch else 'cpu'

insight_app = None
yolo_model = None
behavior_baselines = {}

def load_models():
    global deepfake_model, insight_app, yolo_model
    # 1. Deepfake Model
    if torch:
        try:
            if os.path.exists(DEEPFAKE_MODEL_PATH):
                deepfake_model = torch.load(DEEPFAKE_MODEL_PATH, map_location=device)
                deepfake_model.eval()
                print(f"Loaded deepfake model from {DEEPFAKE_MODEL_PATH}")
            else:
                print(f"Warning: Deepfake model not found at {DEEPFAKE_MODEL_PATH}. Using stub.")
        except Exception as e:
            print(f"Warning: Failed to load deepfake model: {e}")
    
    # 2. InsightFace
    if FaceAnalysis:
        try:
            insight_app = FaceAnalysis(name='buffalo_l', root='~/.insightface')
            insight_app.prepare(ctx_id=0, det_size=(640, 640))
            print("Loaded InsightFace Buffalo_L.")
        except Exception as e:
            print(f"Warning: Failed to load InsightFace: {e}")
            
    # 3. YOLOv8
    if YOLO:
        try:
            yolo_model = YOLO('yolov8n.pt')
            print("Loaded YOLOv8n object detection.")
        except Exception as e:
            print(f"Warning: Failed to load YOLOv8: {e}")

load_models()

# ---------- Helpers ----------
def decode_image(b64_str: str) -> np.ndarray:
    try:
        img_data = base64.b64decode(b64_str)
        image = Image.open(io.BytesIO(img_data)).convert('RGB')
        return np.array(image)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid image base64")

def preprocess_deepfake(img_np: np.ndarray):
    img = Image.fromarray(img_np)
    preprocess = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return preprocess(img).unsqueeze(0).to(device)

def get_deepfake_score(img_np: np.ndarray) -> float:
    if not deepfake_model:
        return 0.05 # stubs
    try:
        tensor = preprocess_deepfake(img_np)
        with torch.no_grad():
            output = deepfake_model(tensor)
            score = torch.sigmoid(output).item()
        return score
    except Exception as e:
        print(f"Deepfake error: {e}")
        return 0.1

def extract_embedding(img_np: np.ndarray) -> List[float]:
    if not insight_app:
        return [0.0] * 512 # stubs
    faces = insight_app.get(img_np)
    if len(faces) == 0:
        return []
    # return largest face
    faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)
    return faces[0].embedding.tolist()

# ---------- Routes ----------

class EnrollRequest(BaseModel):
    frame_b64: str

@app.post("/enroll-face")
async def enroll_face(req: EnrollRequest):
    img = decode_image(req.frame_b64)
    emb = extract_embedding(img)
    if len(emb) == 0:
        raise HTTPException(status_code=400, detail="No face detected for enrollment")
    return {"embedding": emb}

class VerifyRequest(BaseModel):
    frame_b64: str
    embedding: List[float]

@app.post("/verify-face")
async def verify_face(req: VerifyRequest):
    img = decode_image(req.frame_b64)
    emb = extract_embedding(img)
    if len(emb) == 0:
        return {"match": False, "similarity": 0.0, "confidence": 0.0}
    
    # Cosine similarity
    A = np.array(emb)
    B = np.array(req.embedding)
    if np.linalg.norm(A)==0 or np.linalg.norm(B)==0:
         sim = 0.0
    else:
         sim = float(np.dot(A, B) / (np.linalg.norm(A) * np.linalg.norm(B)))
    match = sim > 0.5
    return {"match": match, "similarity": sim, "confidence": 0.9}

class AnalyzeFrameRequest(BaseModel):
    frame_b64: str
    session_id: str

@app.post("/analyze-frame")
async def analyze_frame(req: AnalyzeFrameRequest):
    img = decode_image(req.frame_b64)
    
    # 1. InsightFace: detect face, landmarks, head pose
    face_detected = False
    multi_faces = False
    gaze_dev = False
    pitch = yaw = roll = 0.0
    conf = 0.0
    
    if insight_app:
        faces = insight_app.get(img)
        if len(faces) > 0:
            face_detected = True
            conf = float(faces[0].det_score)
            pitch, yaw, roll = faces[0].pose.tolist() # pitch, yaw, roll approximate
            if len(faces) > 1:
                multi_faces = True
    else:
        # stubs
        face_detected = True
        conf = 0.95
        
    df_score = get_deepfake_score(img)
    
    # 2. YOLO object detection for phone
    phone_detected = False
    if yolo_model:
        results = yolo_model(img, verbose=False)
        for r in results:
            for c in r.boxes.cls:
                if int(c) == 67: # cell phone
                    phone_detected = True
                    break

    return {
        "faceDetected": face_detected,
        "multipleFaces": multi_faces,
        "faceConfidence": conf,
        "headPose": {"pitch": pitch, "yaw": yaw, "roll": roll},
        "gazeDeviation": gaze_dev,
        "deepfakeScore": df_score,
        "deepfakeDetected": df_score > 0.6,
        "phoneDetected": phone_detected,
        "personAbsent": conf < 0.3
    }

class DetectDeepfakeReq(BaseModel):
    frame_b64: str

@app.post("/detect-deepfake")
async def detect_deepfake(req: DetectDeepfakeReq):
    img = decode_image(req.frame_b64)
    score = get_deepfake_score(img)
    return {"score": score, "isDeepfake": score > 0.6}

@app.post("/analyze-behavior")
async def analyze_behavior(req: Dict[str, Any]):
    # session_id tracking ideally injected, passing via body for now
    session_id = req.get("session_id", "default_session")
    typing = req.get("typing", {})
    mouse = req.get("mouse", {})
    
    if session_id not in behavior_baselines:
        # store baseline
        behavior_baselines[session_id] = {
            "dwell": typing.get("avgDwellTime", 0),
            "flight": typing.get("avgFlightTime", 0),
            "speed": mouse.get("avgSpeed", 0)
        }
        return {"typing": 0.0, "mouse": 0.0, "overall": 0.0}
    
    # Compare to baseline
    base = behavior_baselines[session_id]
    
    # Z-score mock (we use standard deviation approximations)
    b_dwell = base["dwell"] if base["dwell"] > 0 else 100
    b_flight = base["flight"] if base["flight"] > 0 else 100
    b_speed = base["speed"] if base["speed"] > 0 else 100
    
    z_dwell = abs(typing.get("avgDwellTime", 0) - b_dwell) / (b_dwell * 0.5)
    z_flight = abs(typing.get("avgFlightTime", 0) - b_flight) / (b_flight * 0.5)
    z_speed = abs(mouse.get("avgSpeed", 0) - b_speed) / (b_speed * 0.5)
    
    t_score = min((z_dwell + z_flight) / 2.0, 1.0)
    m_score = min(z_speed, 1.0)
    
    return {
        "typing": t_score,
        "mouse": m_score,
        "overall": (t_score + m_score) / 2.0
    }
