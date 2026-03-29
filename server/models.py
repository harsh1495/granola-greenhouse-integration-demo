"""
Data models for Granola and Greenhouse clones.
Mirrors real API schemas from both products.
"""
from pydantic import BaseModel


# =====================
# GRANOLA MODELS
# =====================

class GranolaUser(BaseModel):
    id: int
    name: str
    email: str


class GranolaNote(BaseModel):
    id: str  # "not_xxxxxxxxxxxxxx"
    user_id: int
    title: str
    created_at: str
    updated_at: str
    attendees_json: str  # JSON: [{"name": "...", "email": "..."}]
    summary_text: str
    summary_markdown: str
    sent_to_greenhouse: bool = False


class GranolaCalendarEvent(BaseModel):
    id: int
    note_id: str
    event_title: str
    organiser: str
    invitees_json: str  # JSON: [{"email": "..."}]
    scheduled_start_time: str
    scheduled_end_time: str


class GranolaTranscriptEntry(BaseModel):
    id: int
    note_id: str
    speaker_source: str  # "microphone" or "speaker"
    text: str
    start_time: str
    end_time: str


class GranolaIntegration(BaseModel):
    id: int
    user_id: int
    provider: str  # "greenhouse"
    connected: bool = False
    connected_at: str | None = None


# =====================
# GREENHOUSE MODELS
# =====================

class GreenhouseJob(BaseModel):
    id: int
    title: str
    department: str


class GreenhouseCandidate(BaseModel):
    id: int
    name: str
    email: str
    status: str  # "active"
    job_id: int


class GreenhouseInterview(BaseModel):
    id: int
    candidate_id: int
    job_id: int
    stage_name: str  # "Technical Interview"
    interviewer_name: str
    scheduled_start: str
    scheduled_end: str


class GreenhouseScorecard(BaseModel):
    id: int | None = None
    interview_id: int
    candidate_id: int
    interviewer_name: str
    status: str = "pending"  # pending | draft | submitted
    submitted_at: str | None = None
    overall_recommendation: str | None = None
    key_takeaways: str = ""
    notes: str = ""


class GreenhouseGranolaImportedNote(BaseModel):
    id: int | None = None
    candidate_id: int
    interview_id: int
    granola_note_id: str
    summary_markdown: str
    summary_text: str
    transcript_json: str
    imported_at: str


# =====================
# API REQUEST/RESPONSE
# =====================

class SendToGreenhouseRequest(BaseModel):
    candidate_email: str
