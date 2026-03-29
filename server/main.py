"""
FastAPI app — serves both Granola and Greenhouse clone APIs,
plus the built React frontend in production.
"""
import json
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pathlib import Path

from database import init_db, get_db
from pydantic import BaseModel
from models import SendToGreenhouseRequest


class ScorecardSubmission(BaseModel):
    status: str = "draft"
    notes: str = ""
    key_takeaways: str = ""
    overall_recommendation: str | None = None
import query

app = FastAPI(title="Granola × Greenhouse")


@app.on_event("startup")
def startup():
    init_db()


# =====================
# GRANOLA API
# =====================

@app.get("/api/granola/user")
def get_user():
    """Get the current Granola user."""
    db = get_db()
    try:
        user = query.get_user(db)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    finally:
        db.close()


@app.get("/api/granola/notes")
def list_notes():
    """List all Granola notes with calendar events."""
    db = get_db()
    try:
        return query.get_notes(db)
    finally:
        db.close()


@app.get("/api/granola/notes/{note_id}")
def get_note(note_id: str):
    """Get a single note with calendar event + transcript."""
    db = get_db()
    try:
        note = query.get_note(db, note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        return note
    finally:
        db.close()


@app.post("/api/granola/notes/{note_id}/send-to-greenhouse")
def send_note_to_greenhouse(note_id: str, req: SendToGreenhouseRequest):
    """
    Send a Granola note to Greenhouse.

    1. Check integration is connected
    2. Fetch the Granola note
    3. Look up candidate in Greenhouse by req.candidate_email
    4. Find the candidate's interview
    5. Build transcript JSON from transcript_entries
    6. Insert into greenhouse_granola_imported_note
    7. Mark note as sent_to_greenhouse = True
    """
    db = get_db()
    try:
        integration = query.get_integration(db, "greenhouse")
        if not integration or integration["status"] != "connected":
            raise HTTPException(status_code=400, detail="Greenhouse integration is not connected")

        note = query.get_note(db, note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

        candidate = query.get_candidate_by_email(db, req.candidate_email)
        if not candidate:
            raise HTTPException(
                status_code=404,
                detail=f"No Greenhouse candidate found with email {req.candidate_email}",
            )

        interview = query.get_interview_for_candidate(db, candidate["id"])
        if not interview:
            raise HTTPException(status_code=404, detail="No interview found for this candidate")

        query.save_imported_note(db, {
            "candidate_id": candidate["id"],
            "interview_id": interview["id"],
            "granola_note_id": note_id,
            "summary_markdown": note["summary_markdown"],
            "summary_text": note["summary_text"],
            "transcript_json": json.dumps(note.get("transcript_entries", [])),
            "imported_at": datetime.now(timezone.utc).isoformat(),
        })

        query.send_to_greenhouse(db, note_id)

        return {"ok": True, "candidate_name": candidate["name"], "interview_id": interview["id"]}
    finally:
        db.close()


# =====================
# INTEGRATION API
# =====================

@app.get("/api/granola/integration")
def list_integrations():
    """List all integrations as {id, integration}."""
    db = get_db()
    try:
        return query.get_integrations(db)
    finally:
        db.close()


@app.get("/api/granola/integration/{provider}/authorize")
def authorize_page(provider: str):
    """Render the OAuth simulation page."""
    html = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Authorize Granola — Greenhouse</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f5f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #1a1a1a;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
      padding: 40px 48px;
      width: 420px;
      text-align: center;
    }
    .logos {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 28px;
    }
    .logo-box {
      width: 48px; height: 48px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 18px; color: #fff;
    }
    .granola { background: #c8b89a; }
    .greenhouse { background: #24a74b; }
    .arrow { font-size: 20px; color: #999; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
    p { color: #555; font-size: 14px; line-height: 1.5; margin-bottom: 28px; }
    .permissions {
      background: #f9f9f7;
      border: 1px solid #e8e8e4;
      border-radius: 8px;
      padding: 16px 20px;
      text-align: left;
      margin-bottom: 28px;
    }
    .permissions p { margin-bottom: 0; color: #333; font-size: 13px; }
    .permissions ul { margin-top: 8px; padding-left: 18px; color: #555; font-size: 13px; }
    .permissions li { margin-bottom: 4px; }
    .actions { display: flex; gap: 12px; }
    .btn {
      flex: 1;
      padding: 11px 0;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
    }
    .btn-authorize { background: #24a74b; color: #fff; }
    .btn-authorize:hover { background: #1d8e3e; }
    .btn-deny { background: #f0f0ec; color: #333; }
    .btn-deny:hover { background: #e4e4de; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logos">
      <div class="logo-box granola">G</div>
      <span class="arrow">→</span>
      <div class="logo-box greenhouse">GH</div>
    </div>
    <h1>Authorize Granola</h1>
    <p>Granola is requesting access to your Greenhouse account to push interview notes into scorecards.</p>
    <div class="permissions">
      <p><strong>Granola will be able to:</strong></p>
      <ul>
        <li>Read candidate and interview data</li>
        <li>Write notes to interview scorecards</li>
      </ul>
    </div>
    <div class="actions">
      <form method="POST" action="/api/granola/integration/greenhouse/authorize/confirm" style="flex:1">
        <button class="btn btn-authorize" type="submit" style="width:100%">Authorize</button>
      </form>
      <a href="/granola/settings" style="flex:1; text-decoration:none">
        <button class="btn btn-deny" style="width:100%">Deny</button>
      </a>
    </div>
  </div>
</body>
</html>
"""
    return HTMLResponse(content=html)


@app.post("/api/granola/integration/{provider}/authorize/confirm")
def authorize_confirm(provider: str):
    """Handle OAuth confirmation — set connected = True."""
    db = get_db()
    try:
        query.update_integration_status(db, provider, connected=True)
    finally:
        db.close()
    return {"ok": True, "provider": provider}


@app.get("/api/granola/integration/{provider}")
def get_integration(provider: str):
    """Get integration detail for a provider."""
    db = get_db()
    try:
        integration = query.get_integration(db, provider)
        if not integration:
            raise HTTPException(status_code=404, detail=f"Integration '{provider}' not found")
        return integration
    finally:
        db.close()


@app.post("/api/granola/integration/{provider}/disconnect")
def disconnect(provider: str):
    """Disconnect an integration."""
    db = get_db()
    try:
        query.update_integration_status(db, provider, connected=False)
        return {"ok": True}
    finally:
        db.close()


# =====================
# GREENHOUSE API
# =====================

@app.get("/api/greenhouse/interviews")
def list_interviews():
    """List all interviews with candidate + job info."""
    db = get_db()
    try:
        return query.get_interviews(db)
    finally:
        db.close()


@app.get("/api/greenhouse/interviews/{interview_id}")
def get_interview(interview_id: int):
    """
    Get interview detail.
    Include whether a granola_imported_note exists for this interview.
    """
    db = get_db()
    try:
        interview = query.get_interview(db, interview_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        return interview
    finally:
        db.close()


@app.get("/api/greenhouse/interviews/{interview_id}/scorecard")
def get_scorecard(interview_id: int):
    """Get the scorecard for an interview (or empty/pending state)."""
    db = get_db()
    try:
        interview = query.get_interview(db, interview_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        scorecard = query.get_scorecard(db, interview_id)
        if not scorecard:
            # Return an empty pending scorecard shape so the frontend always gets a consistent object
            return {
                "id": None,
                "interview_id": interview_id,
                "candidate_id": interview["candidate_id"],
                "interviewer_name": interview["interviewer_name"],
                "status": "pending",
                "submitted_at": None,
                "overall_recommendation": None,
                "key_takeaways": "",
                "notes": "",
            }
        return scorecard
    finally:
        db.close()


@app.post("/api/greenhouse/interviews/{interview_id}/scorecard")
def save_scorecard(interview_id: int, scorecard: ScorecardSubmission):
    """Save or submit a scorecard."""
    db = get_db()
    try:
        interview = query.get_interview(db, interview_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        data = scorecard.model_dump()
        data["interview_id"] = interview_id
        data["candidate_id"] = interview["candidate_id"]
        data["interviewer_name"] = interview["interviewer_name"]

        if data.get("status") == "submitted" and not data.get("submitted_at"):
            data["submitted_at"] = datetime.now(timezone.utc).isoformat()

        return query.save_scorecard(db, data)
    finally:
        db.close()


@app.post("/api/greenhouse/interviews/{interview_id}/autofill")
def autofill_scorecard(interview_id: int):
    """
    Get the Granola imported note for this interview
    and return the data to populate the scorecard.
    """
    db = get_db()
    try:
        imported = query.get_imported_note(db, interview_id)
        if not imported:
            raise HTTPException(status_code=404, detail="No Granola note found for this interview")
        return {
            "notes": imported["summary_text"],
            "key_takeaways": "",
            "granola_note_id": imported["granola_note_id"],
            "summary_markdown": imported["summary_markdown"],
            "imported_at": imported["imported_at"],
        }
    finally:
        db.close()


# =====================
# SERVE REACT FRONTEND
# =====================

CLIENT_BUILD = Path(__file__).parent.parent / "client" / "dist"

if CLIENT_BUILD.exists():
    app.mount("/assets", StaticFiles(directory=CLIENT_BUILD / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        """Catch-all: serve React app for any non-API route."""
        index = CLIENT_BUILD / "index.html"
        if index.exists():
            return FileResponse(index)
        raise HTTPException(status_code=404)
