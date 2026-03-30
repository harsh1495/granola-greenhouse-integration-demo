# Granola → Greenhouse: Scorecard Autofill Integration

## Project Spec v2

**Date:** March 2026
**Status:** Draft

---

## Overview

A self-contained prototype demonstrating how Granola could natively integrate with Greenhouse to auto-fill interview scorecards — replacing the need for dedicated interview intelligence tools like BrightHire.

The project consists of **two lightweight clones** (Granola + Greenhouse) running as a single app, connected by an integration layer that pushes interview notes from Granola into Greenhouse's scorecard workflow.

### The Pitch

> "BrightHire is Greenhouse's #1 Alliance Partner for scorecard autofill. It was acquired by Zoom in Nov 2025, costs significant per-seat fees, and requires a bot in the call. Granola does bot-free transcription for $14/month. This prototype shows how a native Granola → Greenhouse integration could deliver the same core value — scorecard autofill — with zero friction. Greenhouse's partner program is free to join, making the go-to-market path straightforward."

---

## Architecture

### Single App, Two Portals

One FastAPI server, one SQLite database, one Replit deployment. The Granola clone and Greenhouse clone are separate React routes sharing the same backend.

```
Single FastAPI Server (port 8000)
│
├── /granola/...              → Granola clone (React SPA)
│   ├── Home                  → Upcoming + past meetings
│   ├── My Notes              → All notes list
│   ├── Note Detail           → Note content + "Send to Greenhouse" button
│   └── Settings              → Integrations → Greenhouse connect
│
├── /greenhouse/...           → Greenhouse clone (React SPA)
│   ├── Dashboard             → My interviews with past candidates
│   └── Interview Kit         → Scorecard tab with Granola autofill banner
│
├── /api/granola/...          → Granola mock API
│   ├── GET  /notes           → List notes
│   ├── GET  /notes/:id       → Note detail
│   └── POST /notes/:id/send  → Send note to Greenhouse
│
├── /api/greenhouse/...       → Greenhouse mock API
│   ├── GET  /interviews      → List interviews
│   ├── GET  /scorecards/:id  → Get scorecard (with Granola data if exists)
│   └── POST /scorecards/:id  → Submit scorecard
│
└── /api/integration/...      → Integration management
    ├── GET  /status           → Is Greenhouse connected?
    ├── POST /connect          → Simulate OAuth connect
    └── POST /disconnect       → Disconnect
```

### Data Flow

```
1. INTERVIEW HAPPENS
   └── Notes exist in Granola clone (pre-seeded mock data)

2. USER CONNECTS GREENHOUSE (one-time setup)
   └── Granola Settings → Integrations → Greenhouse → "Connect"
   └── Simulated OAuth redirect → connection flag saved in DB

3. USER SENDS NOTE TO GREENHOUSE
   └── Note detail page → "Send to Greenhouse" button appears (only when connected)
   └── POSTs to Greenhouse API with candidate_email from note attendees
   └── Backend matches email to greenhouse_candidate, finds their interview
   └── Writes note summary + transcript to `greenhouse_granola_imported_note`
   └── Note marked as "sent" in granola_note

4. INTERVIEWER OPENS SCORECARD IN GREENHOUSE
   └── Interview Kit → Scorecard tab
   └── App checks `granola_notes` table for matching candidate
   └── If found: shows "Granola Autofill" banner (like BrightHire's)
   └── Click "Autofill scorecard" → populates notes fields from Granola data

5. INTERVIEWER REVIEWS & SUBMITS
   └── All fields editable, human stays in control
   └── Submit saves the scorecard
```

---

## Data Models

### Granola Side (5 tables)

Uses Granola's real API schema for realism.

```python
class GranolaUser(BaseModel):
    id: int
    name: str          # "Harsh Mehta"
    email: str         # "harsh@company.com"

class GranolaNote(BaseModel):
    id: str            # "not_xxxxxxxxxxxxxx" (Granola's ID format)
    user_id: int
    title: str         # "Interview: Sarah Chen — Product Engineer"
    created_at: str
    updated_at: str
    attendees_json: str    # JSON: [{"name": "Sarah Chen", "email": "sarah@..."}]
    summary_text: str
    summary_markdown: str
    sent_to_greenhouse: bool = False

class GranolaCalendarEvent(BaseModel):
    id: int
    note_id: str       # FK to granola_note
    event_title: str   # "Interview: Sarah Chen — Product Engineer"
    organiser: str     # "harsh@company.com"
    invitees_json: str # JSON: [{"email": "sarah@..."}]
    scheduled_start_time: str  # ISO 8601
    scheduled_end_time: str

class GranolaTranscriptEntry(BaseModel):
    id: int
    note_id: str       # FK to granola_note
    speaker_source: str  # "microphone" or "speaker"
    text: str
    start_time: str
    end_time: str

class GranolaIntegration(BaseModel):
    id: int
    user_id: int
    provider: str      # "greenhouse"
    connected: bool = False
    connected_at: str | None = None
```

### Greenhouse Side (5 tables)

Mirrors Greenhouse Harvest API schema (simplified: one job, one interview per candidate).

```python
class GreenhouseJob(BaseModel):
    id: int
    title: str         # "Product Engineer"
    department: str    # "Engineering"

class GreenhouseCandidate(BaseModel):
    id: int
    name: str          # "Sarah Chen"
    email: str
    status: str        # "active"
    job_id: int

class GreenhouseInterview(BaseModel):
    id: int
    candidate_id: int
    job_id: int
    stage_name: str        # "Technical Interview"
    interviewer_name: str  # "Harsh Mehta"
    scheduled_start: str
    scheduled_end: str

class GreenhouseScorecard(BaseModel):
    id: int | None = None
    interview_id: int
    candidate_id: int
    interviewer_name: str
    status: str        # "pending" | "draft" | "submitted"
    submitted_at: str | None = None
    overall_recommendation: str | None = None  # "strong_yes" | "yes" | "no" | "definitely_not"
    key_takeaways: str = ""
    notes: str = ""

# Granola data that lands in Greenhouse (the bridge table)
class GreenhouseGranolaImportedNote(BaseModel):
    id: int | None = None
    candidate_id: int
    interview_id: int
    granola_note_id: str       # "not_xxxxxxxxxxxxxx"
    summary_markdown: str
    summary_text: str
    transcript_json: str
    imported_at: str
```

---

## Mock Seed Data

### Granola Notes (3 notes)

**Note 1:** Interview with Sarah Chen
- Title: "Interview: Sarah Chen — Product Engineer"
- Date: Mar 25, 2026, 2:00 PM
- Attendees: Sarah Chen (sarah.chen@email.com), Harsh Mehta
- Summary: Covers technical discussion about React, system design, API patterns
- Transcript: 8-10 entries covering a realistic technical interview

**Note 2:** Interview with James Park
- Title: "Interview: James Park — Product Engineer"
- Date: Mar 24, 2026, 10:00 AM
- Attendees: James Park (james.park@email.com), Harsh Mehta
- Summary: Covers product thinking, past project walkthrough
- Transcript: 8-10 entries

**Note 3:** Team standup (non-interview, should NOT have Send button logic)
- Title: "Engineering Standup"
- Date: Mar 26, 2026, 9:30 AM
- Attendees: internal team only
- Summary: Sprint updates

### Greenhouse Data

**Job:** Product Engineer, Engineering department

**Candidates:**
1. Sarah Chen (sarah.chen@email.com) — active
2. James Park (james.park@email.com) — active
3. Maria Garcia (maria.garcia@email.com) — active (no Granola note)

**Interviews** (one per candidate):
- Sarah Chen: Technical Interview, Mar 25 2026 2:00-3:00 PM, interviewer "Harsh Mehta"
- James Park: Technical Interview, Mar 24 2026 10:00-11:00 AM, interviewer "Harsh Mehta"
- Maria Garcia: Technical Interview, Mar 28 2026 1:00-2:00 PM, interviewer "Harsh Mehta"

---

## UI Screens

### Granola Clone

#### Screen 1: Home (`/granola`)
- Left sidebar with: Home, My Notes (under "Spaces" section like real Granola)
- Main area: "Coming up" section with today's date + upcoming meetings
- Below: past notes listed by date (e.g. "Fri, Mar 27", "Tue, Mar 24")
- Each note row: icon, title, attendee name, time, lock icon
- Bottom: "Ask anything" chat bar with recipe suggestions (non-functional, decorative)
- Warm cream/beige color scheme matching Granola's real aesthetic

#### Screen 2: My Notes (`/granola/notes`)
- Same sidebar
- "My notes" heading with "Your private notes and folders" subtitle
- Chat bar area with model selector (decorative)
- Notes listed by date, same format as home

#### Screen 3: Note Detail (`/granola/notes/:id`)
- Back button (← icon)
- Note title as heading
- Metadata row: date chip, attendee chip, "+ Add to folder" chip
- Note content rendered from summary_markdown (structured with headings + bullets)
- Top right: "Enhanced" dropdown (decorative), **"Share" button** → when Greenhouse is connected, shows a "Send to Greenhouse" option
- If already sent: show a green checkmark "Sent to Greenhouse"
- Bottom: "Ask anything" bar with "Write follow up email" recipe button

#### Screen 4: Settings (`/granola/settings`)
- Left sidebar with sections matching real Granola:
  - **Profile area** at top (name, email, "Edit profile")
  - Preferences, Calendar, Notifications, Labs (non-functional labels)
  - **Connectors**: MCP, API (non-functional labels)
  - **Workspace**: General, Team, Analytics, Billing, Referrals (non-functional)
  - **Support**: Help Center, Send feedback (non-functional)
  - **Integrations**: Slack, HubSpot, Notion, Zapier, Affinity, Attio, **Greenhouse** ← only this one is clickable
  - Sign out at bottom
- Main content area when Greenhouse is selected:
  - Greenhouse logo + "Greenhouse" heading
  - "Send your interview notes directly to Greenhouse" subtitle
  - **"Connect Greenhouse ↗" button** (when not connected)
  - Or **"Connected ✓" badge + "Disconnect" button** (when connected)
  - "How it works" section:
    1. Click Connect and authorize Granola to access your Greenhouse account
    2. After an interview, click "Send to Greenhouse" on any note
    3. Your notes will appear in the candidate's scorecard in Greenhouse

#### OAuth Simulation Flow
1. User clicks "Connect Greenhouse ↗"
2. Browser redirects to `/api/integration/connect` which shows a simple "Authorize Granola?" page
3. User clicks "Authorize"
4. Redirected back to `/granola/settings` with connection saved
5. "Connect" button changes to "Connected ✓"

### Greenhouse Clone

#### Screen 5: Dashboard (`/greenhouse`)
- Top nav: Greenhouse Recruiting logo, Jobs, Candidates, Reports, Integrations, Add button, Search (all decorative except current page)
- "My Dashboard" heading
- **"My interviews"** section showing scheduled/past interviews:
  - Each row: candidate avatar/name (redactable), date + time, interview stage name, job title, requisition ID, "See interview kit" button
  - "See past interviews >" link

#### Screen 6: Interview Kit / Scorecard (`/greenhouse/interviews/:id`)
- Header: "Interview Kit" label, close button
- Job title + interview stage name (e.g. "Product Engineer" / "Technical Interview")
- Tab bar: Interview Prep | Job Details | Resume | **Scorecard** (active)

**Scorecard Tab contents:**

**Granola Autofill Banner** (only shown if `greenhouse_granola_imported_note` record exists for this candidate):
- Styled card with Granola icon + "Granola Scorecard Autofill" heading
- "Autofill scorecard" button (green/branded)
- If note was found: "We matched this recording from your Granola notes" with note title

**Bias reminder banner:**
- "Remember to focus on job-relevant qualifications and support your judgments with objective examples."
- "This reduces bias and helps us hire the best candidates."

**Interview Notes section:**
- Free text area for notes (empty initially, populated on autofill with summary_text)

**Key Takeaways section:**
- Free text area

**Overall Recommendation:**
- 4-option selector (Definitely Not / No / Yes / Strong Yes)

**Submit Scorecard button**

**Autofill behavior:**
1. User clicks "Autofill scorecard" on the Granola banner
2. The `summary_text` from the imported Granola note populates the "Interview Notes" field
3. Fields are highlighted (yellow/amber background) to indicate they're from Granola
4. User can edit everything before submitting
5. On submit, scorecard status changes to "submitted"

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React (Vite) with React Router |
| Styling | CSS Modules (provided in scaffolding) |
| Backend | Python FastAPI |
| Database | SQLite (via sqlite3) |
| Deployment | Replit (single port, FastAPI serves React build) |

---

## API Endpoints

### Granola Mock API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/granola/notes` | List all mock notes |
| `GET` | `/api/granola/notes/:id` | Get note detail with transcript |
| `POST` | `/api/granola/notes/:id/send-to-greenhouse` | Send note to Greenhouse. Body: `{"candidate_email": "sarah.chen@email.com"}`. Looks up candidate in Greenhouse by email, writes to `greenhouse_granola_imported_note` table. |

### Greenhouse Mock API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/greenhouse/interviews` | List all interviews (with candidate + job info) |
| `GET` | `/api/greenhouse/interviews/:id` | Get interview detail + check if `greenhouse_granola_imported_note` exists for this candidate |
| `GET` | `/api/greenhouse/interviews/:id/scorecard` | Get existing scorecard or empty |
| `POST` | `/api/greenhouse/interviews/:id/scorecard` | Save/submit scorecard |

### Integration API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/integration/status` | Returns `{connected: bool, connected_at: str \| null}` |
| `POST` | `/api/integration/connect` | Sets connected = true |
| `POST` | `/api/integration/disconnect` | Sets connected = false |
| `GET` | `/api/integration/authorize` | OAuth simulation page (HTML) |
| `POST` | `/api/integration/authorize/confirm` | Confirm OAuth, redirect back |

---

## Database Schema (SQLite)

```sql
-- =====================
-- GRANOLA SIDE (5 tables)
-- =====================

CREATE TABLE granola_user (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL
);

CREATE TABLE granola_note (
    id TEXT PRIMARY KEY,              -- "not_xxxxxxxxxxxxxx"
    user_id INTEGER REFERENCES granola_user(id),
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    attendees_json TEXT,              -- JSON: [{"name": "...", "email": "..."}]
    summary_text TEXT,
    summary_markdown TEXT,
    sent_to_greenhouse BOOLEAN DEFAULT FALSE
);

CREATE TABLE granola_calendar_event (
    id INTEGER PRIMARY KEY,
    note_id TEXT REFERENCES granola_note(id),
    event_title TEXT NOT NULL,
    organiser TEXT NOT NULL,
    invitees_json TEXT,               -- JSON: [{"email": "..."}]
    scheduled_start_time TEXT NOT NULL,
    scheduled_end_time TEXT NOT NULL
);

CREATE TABLE granola_transcript_entry (
    id INTEGER PRIMARY KEY,
    note_id TEXT REFERENCES granola_note(id),
    speaker_source TEXT NOT NULL,     -- "microphone" or "speaker"
    text TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL
);

CREATE TABLE granola_integration (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES granola_user(id),
    provider TEXT NOT NULL,           -- "greenhouse"
    connected BOOLEAN DEFAULT FALSE,
    connected_at TEXT
);

-- =====================
-- GREENHOUSE SIDE (5 tables)
-- =====================

CREATE TABLE greenhouse_job (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT NOT NULL
);

CREATE TABLE greenhouse_candidate (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    job_id INTEGER REFERENCES greenhouse_job(id)
);

CREATE TABLE greenhouse_interview (
    id INTEGER PRIMARY KEY,
    candidate_id INTEGER REFERENCES greenhouse_candidate(id),
    job_id INTEGER REFERENCES greenhouse_job(id),
    stage_name TEXT NOT NULL,          -- "Technical Interview"
    interviewer_name TEXT NOT NULL,
    scheduled_start TEXT NOT NULL,
    scheduled_end TEXT NOT NULL
);

CREATE TABLE greenhouse_scorecard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id INTEGER REFERENCES greenhouse_interview(id),
    candidate_id INTEGER REFERENCES greenhouse_candidate(id),
    interviewer_name TEXT,
    status TEXT DEFAULT 'pending',    -- pending | draft | submitted
    submitted_at TEXT,
    overall_recommendation TEXT,      -- strong_yes | yes | no | definitely_not
    key_takeaways TEXT DEFAULT '',
    notes TEXT DEFAULT ''
);

CREATE TABLE greenhouse_granola_imported_note (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER REFERENCES greenhouse_candidate(id),
    interview_id INTEGER REFERENCES greenhouse_interview(id),
    granola_note_id TEXT NOT NULL,
    summary_markdown TEXT,
    summary_text TEXT,
    transcript_json TEXT,
    imported_at TEXT NOT NULL
);
```

---

## File Structure

```
granola-greenhouse/
├── README.md
├── recipe/
│   └── scorecard-recipe.md
├── server/
│   ├── main.py                  # FastAPI app, routes, static file serving
│   ├── models.py                # Pydantic models
│   ├── database.py              # SQLite init, seed data, query helpers
│   └── requirements.txt
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx              # Router setup
│       ├── main.jsx             # Entry point
│       │
│       ├── granola/             # Granola clone pages
│       │   ├── GranolaLayout.jsx
│       │   ├── GranolaLayout.module.css
│       │   ├── HomePage.jsx
│       │   ├── HomePage.module.css
│       │   ├── MyNotesPage.jsx
│       │   ├── MyNotesPage.module.css
│       │   ├── NoteDetailPage.jsx
│       │   ├── NoteDetailPage.module.css
│       │   ├── SettingsPage.jsx
│       │   └── SettingsPage.module.css
│       │
│       ├── greenhouse/          # Greenhouse clone pages
│       │   ├── GreenhouseLayout.jsx
│       │   ├── GreenhouseLayout.module.css
│       │   ├── DashboardPage.jsx
│       │   ├── DashboardPage.module.css
│       │   ├── InterviewKitPage.jsx
│       │   └── InterviewKitPage.module.css
│       │
│       ├── components/          # Shared components
│       │   ├── AutofillBanner.jsx
│       │   ├── AutofillBanner.module.css
│       │   ├── OAuthPage.jsx
│       │   └── OAuthPage.module.css
│       │
│       └── styles/
│           └── global.css       # CSS reset + shared variables
│
└── .replit                      # Replit config
```

---

## What You Implement (Backend + Frontend Logic)

All CSS modules are provided. You write:

### Backend (Python)
- [ ] `database.py` — `init_db()` with CREATE TABLE + INSERT seed data
- [ ] `database.py` — Query helper functions
- [ ] `main.py` — All route handlers
- [ ] OAuth simulation logic (can be simple: render HTML page, save flag)

### Frontend (React)
- [ ] `App.jsx` — React Router setup
- [ ] Granola pages — Fetch and display notes, settings, send-to-greenhouse logic
- [ ] Greenhouse pages — Fetch and display interviews, scorecard form, autofill logic
- [ ] `OAuthPage.jsx` — Simple authorize/deny page
- [ ] Wire up API calls (fetch/POST to backend)

### What's Provided (Scaffolding)
- All `.module.css` files with complete styling
- `models.py` with Pydantic schemas
- `requirements.txt`
- Vite + React config
- Replit config
- README

---

## Demo Script

1. **Start in Granola clone** → Show the home page with interview notes
2. **Go to Settings → Integrations → Greenhouse** → Click "Connect Greenhouse"
3. **OAuth flow** → Authorize page → redirected back, now connected
4. **Open an interview note** → "Send to Greenhouse" button now visible
5. **Click "Send to Greenhouse"** → Note sent, checkmark appears
6. **Switch to Greenhouse clone** → Dashboard shows interviews
7. **Open Sarah Chen's interview kit → Scorecard tab**
8. **Granola Autofill banner appears** → "We matched a note from Granola"
9. **Click "Autofill scorecard"** → Key takeaways populated from Granola summary
10. **Review, adjust, submit**
11. **Talk business case** → BrightHire comparison, cost savings, partner program path

---

## Resolved Decisions

1. **Send-to-Greenhouse matching** — The "Send to Greenhouse" button sends a POST to `/api/granola/notes/:id/send-to-greenhouse` with body `{"candidate_email": "..."}`. The backend looks up the candidate by email in `greenhouse_candidate`, finds their interview in `greenhouse_interview`, and writes the note data to `greenhouse_granola_imported_note`. If the email doesn't match any candidate, return an error.

2. **One interview per candidate** — Each candidate has exactly one interview. No need to handle multiple rounds or disambiguation.
