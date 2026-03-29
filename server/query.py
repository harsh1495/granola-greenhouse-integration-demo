import json
import sqlite3
from datetime import datetime, timezone


# =====================
# GRANOLA QUERIES
# =====================

def get_user(db: sqlite3.Connection) -> dict | None:
    """Get the single Granola user."""
    row = db.execute("SELECT * FROM granola_user WHERE id = 1").fetchone()
    return dict(row) if row else None


def _build_note(row: dict, cal: dict | None = None, transcript_rows: list[dict] | None = None) -> dict:
    """
    Shape a raw DB row (+ optional calendar + transcript) into the
    Note response format matching frontend types.
    """
    attendees = json.loads(row.get("attendees_json") or "[]")
    owner = next(
        (a for a in attendees if a["email"] == "harsh@company.com"),
        {"name": "Harsh Mehta", "email": "harsh@company.com"},
    )

    calendar_event = None
    if cal:
        calendar_event = {
            "event_title": cal.get("event_title"),
            "organiser": cal.get("organiser"),
            "invitees": json.loads(cal.get("invitees_json") or "[]"),
            "calendar_event_id": None,
            "scheduled_start_time": cal.get("scheduled_start_time"),
            "scheduled_end_time": cal.get("scheduled_end_time"),
        }

    note = {
        "id": row["id"],
        "object": "note",
        "title": row["title"],
        "owner": owner,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "attendees": attendees,
        "folder_membership": [],
        "summary_text": row.get("summary_text") or "",
        "summary_markdown": row.get("summary_markdown"),
        "sent_to_greenhouse": bool(row.get("sent_to_greenhouse")),
        "calendar_event": calendar_event,
    }

    if transcript_rows is not None:
        note["transcript"] = [
            {
                "speaker": {"source": t["speaker_source"]},
                "text": t["text"],
                "start_time": t["start_time"],
                "end_time": t["end_time"],
            }
            for t in transcript_rows
        ]

    return note


def get_notes(db: sqlite3.Connection) -> dict:
    """
    Return all notes with nested calendar_event, wrapped in
    {notes, hasMore, cursor} matching the frontend ListNotesOutput type.
    """
    rows = db.execute("""
        SELECT n.*, e.event_title, e.organiser, e.invitees_json,
               e.scheduled_start_time, e.scheduled_end_time
        FROM granola_note n
        LEFT JOIN granola_calendar_event e ON e.note_id = n.id
        ORDER BY n.created_at DESC
    """).fetchall()

    notes = []
    for r in rows:
        row = dict(r)
        cal = {
            "event_title": row.pop("event_title", None),
            "organiser": row.pop("organiser", None),
            "invitees_json": row.pop("invitees_json", None),
            "scheduled_start_time": row.pop("scheduled_start_time", None),
            "scheduled_end_time": row.pop("scheduled_end_time", None),
        } if row.get("scheduled_start_time") or "event_title" in row else None

        # Clean up any leftover calendar keys if no event
        for k in ("event_title", "organiser", "invitees_json", "scheduled_start_time", "scheduled_end_time"):
            row.pop(k, None)

        notes.append(_build_note(row, cal))

    return {"notes": notes, "hasMore": False, "cursor": None}


def get_note(db: sqlite3.Connection, note_id: str) -> dict | None:
    """Get a single note with nested calendar_event + transcript."""
    row = db.execute("SELECT * FROM granola_note WHERE id = ?", (note_id,)).fetchone()
    if not row:
        return None

    cal_row = db.execute(
        "SELECT * FROM granola_calendar_event WHERE note_id = ?", (note_id,)
    ).fetchone()

    transcript_rows = db.execute(
        "SELECT * FROM granola_transcript_entry WHERE note_id = ? ORDER BY id", (note_id,)
    ).fetchall()

    return _build_note(
        dict(row),
        dict(cal_row) if cal_row else None,
        [dict(t) for t in transcript_rows],
    )


def get_integrations(db: sqlite3.Connection) -> list[dict]:
    """Return all integrations as {id, integration} list."""
    rows = db.execute("SELECT * FROM granola_integration").fetchall()
    return [{"id": r["id"], "integration": r["provider"]} for r in rows]


def get_integration(db: sqlite3.Connection, provider: str) -> dict | None:
    """Return full integration detail for one provider."""
    row = db.execute(
        "SELECT * FROM granola_integration WHERE provider = ?", (provider,)
    ).fetchone()
    if not row:
        return None
    r = dict(row)
    return {
        "id": r["id"],
        "integration": r["provider"],
        "status": "connected" if r["connected"] else "disconnected",
        "connected_at": r.get("connected_at"),
    }


def update_integration_status(db: sqlite3.Connection, provider: str, connected: bool):
    """Update integration connection status."""
    connected_at = datetime.now(timezone.utc).isoformat() if connected else None
    db.execute(
        "UPDATE granola_integration SET connected = ?, connected_at = ? WHERE provider = ?",
        (connected, connected_at, provider),
    )
    db.commit()


def send_to_greenhouse(db: sqlite3.Connection, note_id: str):
    """Set sent_to_greenhouse = True on a note."""
    db.execute(
        "UPDATE granola_note SET sent_to_greenhouse = TRUE WHERE id = ?", (note_id,)
    )
    db.commit()


# =====================
# GREENHOUSE QUERIES
# =====================

def _build_interview(row: dict, db: sqlite3.Connection) -> dict:
    """Shape a raw interview DB row into the nested GHInterview response format."""
    scorecard = get_scorecard(db, row["id"])
    imported = get_imported_note(db, row["id"])
    return {
        "id": row["id"],
        "candidate_id": row["candidate_id"],
        "job_id": row["job_id"],
        "stage_name": row["stage_name"],
        "interviewer_name": row["interviewer_name"],
        "scheduled_at": row.get("scheduled_start"),
        "candidate": {
            "id": row["candidate_id"],
            "name": row["candidate_name"],
            "email": row["candidate_email"],
        },
        "job": {
            "id": row["job_id"],
            "title": row["job_title"],
        },
        "scorecard_status": scorecard["status"] if scorecard else "pending",
        "granola_note": imported,
    }


def get_interviews(db: sqlite3.Connection) -> list[dict]:
    rows = db.execute("""
        SELECT i.*,
               c.name  AS candidate_name,
               c.email AS candidate_email,
               j.title AS job_title,
               j.department
        FROM greenhouse_interview i
        JOIN greenhouse_candidate c ON c.id = i.candidate_id
        JOIN greenhouse_job       j ON j.id = i.job_id
        ORDER BY i.scheduled_start DESC
    """).fetchall()
    return [_build_interview(dict(r), db) for r in rows]


def get_interview(db: sqlite3.Connection, interview_id: int) -> dict | None:
    row = db.execute("""
        SELECT i.*,
               c.name  AS candidate_name,
               c.email AS candidate_email,
               j.title AS job_title,
               j.department
        FROM greenhouse_interview i
        JOIN greenhouse_candidate c ON c.id = i.candidate_id
        JOIN greenhouse_job       j ON j.id = i.job_id
        WHERE i.id = ?
    """, (interview_id,)).fetchone()
    if not row:
        return None
    return _build_interview(dict(row), db)


def get_candidate_by_email(db: sqlite3.Connection, email: str) -> dict | None:
    row = db.execute(
        "SELECT * FROM greenhouse_candidate WHERE email = ?", (email,)
    ).fetchone()
    return dict(row) if row else None


def get_interview_for_candidate(db: sqlite3.Connection, candidate_id: int) -> dict | None:
    row = db.execute(
        "SELECT * FROM greenhouse_interview WHERE candidate_id = ?", (candidate_id,)
    ).fetchone()
    return dict(row) if row else None


def get_scorecard(db: sqlite3.Connection, interview_id: int) -> dict | None:
    row = db.execute(
        "SELECT * FROM greenhouse_scorecard WHERE interview_id = ?", (interview_id,)
    ).fetchone()
    return dict(row) if row else None


def save_scorecard(db: sqlite3.Connection, scorecard: dict) -> dict:
    existing = db.execute(
        "SELECT id FROM greenhouse_scorecard WHERE interview_id = ?",
        (scorecard["interview_id"],),
    ).fetchone()

    if existing:
        db.execute("""
            UPDATE greenhouse_scorecard
               SET status = ?, submitted_at = ?, overall_recommendation = ?,
                   key_takeaways = ?, notes = ?
             WHERE interview_id = ?
        """, (
            scorecard.get("status", "pending"),
            scorecard.get("submitted_at"),
            scorecard.get("overall_recommendation"),
            scorecard.get("key_takeaways", ""),
            scorecard.get("notes", ""),
            scorecard["interview_id"],
        ))
    else:
        db.execute("""
            INSERT INTO greenhouse_scorecard
                (interview_id, candidate_id, interviewer_name, status,
                 submitted_at, overall_recommendation, key_takeaways, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            scorecard["interview_id"],
            scorecard["candidate_id"],
            scorecard.get("interviewer_name", ""),
            scorecard.get("status", "pending"),
            scorecard.get("submitted_at"),
            scorecard.get("overall_recommendation"),
            scorecard.get("key_takeaways", ""),
            scorecard.get("notes", ""),
        ))

    db.commit()
    return get_scorecard(db, scorecard["interview_id"])


def get_imported_note(db: sqlite3.Connection, interview_id: int) -> dict | None:
    row = db.execute("""
        SELECT imp.*, n.title AS note_title
        FROM greenhouse_granola_imported_note imp
        LEFT JOIN granola_note n ON n.id = imp.granola_note_id
        WHERE imp.interview_id = ?
    """, (interview_id,)).fetchone()
    return dict(row) if row else None


def save_imported_note(db: sqlite3.Connection, note: dict):
    db.execute("""
        INSERT INTO greenhouse_granola_imported_note
            (candidate_id, interview_id, granola_note_id, summary_markdown,
             summary_text, transcript_json, imported_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        note["candidate_id"],
        note["interview_id"],
        note["granola_note_id"],
        note["summary_markdown"],
        note["summary_text"],
        note["transcript_json"],
        note["imported_at"],
    ))
    db.commit()
