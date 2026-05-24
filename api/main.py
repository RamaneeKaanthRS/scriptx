import logging
import uuid
import os
import shutil
import random
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.ml_pipeline import ScriptAnalyzerMLPipeline
from api.database import get_db, Script, Analysis, Weakness, Recommendation, EmotionalPoint, STORAGE_DIR, VerificationCode
from api.storage_service import StorageService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Smart Script Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ml_pipeline = ScriptAnalyzerMLPipeline()

# --- Pydantic Schemas ---
class WeaknessSchema(BaseModel):
    category: str
    description: str
    severity: float

    class Config:
        from_attributes = True

class RecommendationSchema(BaseModel):
    issue: str
    recommendation: str

    class Config:
        from_attributes = True

class EmotionalPointSchema(BaseModel):
    timestamp: float
    sentiment: float

    class Config:
        from_attributes = True

class ScriptSchema(BaseModel):
    id: str
    name: str
    type: str
    file_path: str
    status: str
    score: float
    created_at: str

    class Config:
        from_attributes = True

class AnalysisResponseSchema(BaseModel):
    genre: str
    structure: str
    predictedQuality: float
    intelligentScore: float
    weaknesses: List[WeaknessSchema]
    recommendations: List[RecommendationSchema]
    emotionalCurve: List[EmotionalPointSchema]

    class Config:
        from_attributes = True

class FullAnalysisPayload(BaseModel):
    script: ScriptSchema
    analysis: AnalysisResponseSchema

class SendCodePayload(BaseModel):
    email: str
    code: Optional[str] = None

class VerifyCodePayload(BaseModel):
    email: str
    code: str

class GuestCleanupPayload(BaseModel):
    user_id: str

# --- Endpoints ---

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "ML Backend and Local DB are running"}

@app.post("/api/auth/send-code")
async def send_verification_code(payload: SendCodePayload, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address format.")
    
    # Generate 6-digit code (use pre-generated code if supplied by frontend)
    code = payload.code.strip() if (payload.code and payload.code.strip()) else f"{random.randint(100000, 999999)}"
    
    # Upsert code
    db_code = db.query(VerificationCode).filter(VerificationCode.email == email).first()
    if db_code:
        db_code.code = code
        db_code.created_at = datetime.utcnow()
    else:
        db_code = VerificationCode(email=email, code=code)
        db.add(db_code)
    
    db.commit()
    
    # Simulation print to console
    sim_message = f"\n" + "="*80 + f"\n[EMAIL SIMULATION] Verification Code for {email} is: {code}\n" + "="*80 + "\n"
    logger.info(sim_message)
    print(sim_message, flush=True)
    
    # Log to local storage/email_sim.log
    sim_log_path = os.path.join(STORAGE_DIR, "email_sim.log")
    try:
        with open(sim_log_path, "a") as f:
            f.write(f"[{datetime.utcnow().isoformat()}] Verification Code for {email}: {code}\n")
    except Exception as e:
        logger.error(f"Failed to write email simulation log: {e}")
        
    return {
        "status": "success", 
        "message": f"Verification code simulated successfully for {email}. Check server terminal or storage/email_sim.log."
    }

@app.post("/api/auth/verify-code")
async def verify_code(payload: VerifyCodePayload, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    code = payload.code.strip()
    
    db_code = db.query(VerificationCode).filter(VerificationCode.email == email).first()
    if not db_code:
        raise HTTPException(status_code=400, detail="No verification code was sent to this email.")
        
    # Check expiry (e.g. 10 minutes)
    time_elapsed = datetime.utcnow() - db_code.created_at
    if time_elapsed > timedelta(minutes=10):
        db.delete(db_code)
        db.commit()
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")
        
    if db_code.code != code:
        raise HTTPException(status_code=400, detail="Invalid verification code. Please try again.")
        
    # Clear the verified code
    db.delete(db_code)
    db.commit()
    
    # Return mock user session
    return {
        "id": "local_user_" + str(hash(email) % 1000),
        "name": email.split("@")[0].capitalize(),
        "email": email
    }

@app.post("/api/guest/cleanup")
async def cleanup_guest_data(payload: GuestCleanupPayload, db: Session = Depends(get_db)):
    user_id = payload.user_id.strip()
    if not user_id.startswith("guest_"):
        raise HTTPException(status_code=400, detail="Only guest accounts can be automatically cleaned up.")
    
    # 1. Delete associated child records
    db.query(Weakness).filter(Weakness.user_id == user_id).delete(synchronize_session=False)
    db.query(Recommendation).filter(Recommendation.user_id == user_id).delete(synchronize_session=False)
    db.query(EmotionalPoint).filter(EmotionalPoint.user_id == user_id).delete(synchronize_session=False)
    db.query(Analysis).filter(Analysis.user_id == user_id).delete(synchronize_session=False)
    
    # 2. Find and delete screenplay files (local or Supabase Storage)
    scripts = db.query(Script).filter(Script.user_id == user_id).all()
    for s in scripts:
        if s.file_path:
            StorageService.delete_file(s.file_path)
        db.delete(s)
        
    db.commit()
    logger.info(f"Successfully cleaned up all transient data for Guest: {user_id}")
    return {"status": "success", "message": f"Transient guest session data successfully cleaned up."}

@app.post("/api/analyze")
async def analyze_script(file: UploadFile = File(...), user_id: Optional[str] = Form(None), db: Session = Depends(get_db)):
    try:
        # 1. Save file using unified storage service (handles local fallback & Supabase Storage)
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'txt'
        script_id = str(uuid.uuid4())
        file_content = await file.read()
        file_path = StorageService.save_file(file.filename, file_content)
            
        # 2. Extract Text (using storage service)
        script_text = StorageService.read_file_text(file_path)
            
        if not script_text.strip():
            script_text = "Mock script content for testing if file was binary."

        # 3. Run ML Pipeline
        results = ml_pipeline.analyze_script(script_text)
        
        # 4. Save to SQLite associated with active user
        active_user_id = user_id if (user_id and user_id.strip()) else "local_user_1"
        
        db_script = Script(
            id=script_id,
            name=file.filename,
            type=file_ext,
            file_path=file_path,
            status="completed",
            score=results["intelligentScore"],
            user_id=active_user_id
        )
        db.add(db_script)
        
        db_analysis = Analysis(
            id=str(uuid.uuid4()),
            script_id=script_id,
            genre=results["genre"],
            structure=results["structure"],
            predicted_quality=results["predictedQuality"],
            intelligent_score=results["intelligentScore"],
            user_id=active_user_id
        )
        db.add(db_analysis)
        
        for w in results["weaknesses"]:
            db.add(Weakness(id=str(uuid.uuid4()), script_id=script_id, category=w["category"], description=w["description"], severity=w["severity"], user_id=active_user_id))
            
        for r in results["recommendations"]:
            db.add(Recommendation(id=str(uuid.uuid4()), script_id=script_id, issue=r["issue"], recommendation=r["recommendation"], user_id=active_user_id))
            
        for e in results["emotionalCurve"]:
            db.add(EmotionalPoint(id=str(uuid.uuid4()), script_id=script_id, timestamp=e["timestamp"], sentiment=e["sentiment"], user_id=active_user_id))
            
        db.commit()
        
        return {"script_id": script_id}
        
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error during analysis")

@app.get("/api/scripts")
async def get_scripts(x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    query = db.query(Script)
    if x_user_id:
        query = query.filter(Script.user_id == x_user_id)
    scripts = query.order_by(Script.created_at.desc()).all()
    # Map to expected frontend format
    return [{
        "id": s.id,
        "name": s.name,
        "score": s.score,
        "createdAt": s.created_at.isoformat()
    } for s in scripts]

@app.get("/api/analyses/{script_id}")
async def get_analysis(script_id: str, x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    query = db.query(Script).filter(Script.id == script_id)
    if x_user_id:
        query = query.filter(Script.user_id == x_user_id)
    script = query.first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
        
    analysis = db.query(Analysis).filter(Analysis.script_id == script_id).first()
    weaknesses = db.query(Weakness).filter(Weakness.script_id == script_id).all()
    recommendations = db.query(Recommendation).filter(Recommendation.script_id == script_id).all()
    emotional_curve = db.query(EmotionalPoint).filter(EmotionalPoint.script_id == script_id).order_by(EmotionalPoint.timestamp.asc()).all()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    return {
        "script": {
            "id": script.id,
            "name": script.name,
            "score": script.score,
            "createdAt": script.created_at.isoformat()
        },
        "analysis": {
            "genre": analysis.genre,
            "structure": analysis.structure,
            "predictedQuality": analysis.predicted_quality,
            "intelligentScore": analysis.intelligent_score,
            "weaknesses": [{"category": w.category, "description": w.description, "severity": w.severity} for w in weaknesses],
            "recommendations": [{"issue": r.issue, "recommendation": r.recommendation} for r in recommendations],
            "emotionalCurve": [{"timestamp": e.timestamp, "sentiment": e.sentiment} for e in emotional_curve]
        }
    }
