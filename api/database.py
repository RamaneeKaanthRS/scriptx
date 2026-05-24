import os
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "storage"))
os.makedirs(STORAGE_DIR, exist_ok=True)
os.makedirs(os.path.join(STORAGE_DIR, "scripts"), exist_ok=True)
os.makedirs(os.path.join(STORAGE_DIR, "embeddings"), exist_ok=True)

# Default database URL. Fallback to local SQLite for seamless development.
# In production, set the DATABASE_URL environment variable to your Supabase PostgreSQL connection string.
# Production Supabase URL: postgresql://postgres:Radiant_RAM%40180516@db.rxbkshcjqhutstlapetv.supabase.co:5432/postgres
DEFAULT_DATABASE_URL = "sqlite:///./storage/sqlite.db"
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=10,
        max_overflow=20
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Script(Base):
    __tablename__ = "scripts"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)
    file_path = Column(String)
    status = Column(String)
    score = Column(Float)
    user_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    analyses = relationship("Analysis", back_populates="script")
    weaknesses = relationship("Weakness", back_populates="script")
    recommendations = relationship("Recommendation", back_populates="script")
    emotional_curve = relationship("EmotionalPoint", back_populates="script")

class Analysis(Base):
    __tablename__ = "analyses"
    id = Column(String, primary_key=True, index=True)
    script_id = Column(String, ForeignKey("scripts.id"))
    genre = Column(String)
    structure = Column(String)
    predicted_quality = Column(Float)
    intelligent_score = Column(Float)
    user_id = Column(String)

    script = relationship("Script", back_populates="analyses")

class Weakness(Base):
    __tablename__ = "weaknesses"
    id = Column(String, primary_key=True, index=True)
    script_id = Column(String, ForeignKey("scripts.id"))
    category = Column(String)
    description = Column(String)
    severity = Column(Float)
    user_id = Column(String)

    script = relationship("Script", back_populates="weaknesses")

class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(String, primary_key=True, index=True)
    script_id = Column(String, ForeignKey("scripts.id"))
    issue = Column(String)
    recommendation = Column(String)
    user_id = Column(String)

    script = relationship("Script", back_populates="recommendations")

class EmotionalPoint(Base):
    __tablename__ = "emotional_curve"
    id = Column(String, primary_key=True, index=True)
    script_id = Column(String, ForeignKey("scripts.id"))
    timestamp = Column(Float)
    sentiment = Column(Float)
    user_id = Column(String)

    script = relationship("Script", back_populates="emotional_curve")

class VerificationCode(Base):
    __tablename__ = "verification_codes"
    email = Column(String, primary_key=True, index=True)
    code = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
