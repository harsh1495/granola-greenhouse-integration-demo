"""
SQLite database setup, seed data, and query helpers.

Tables (10 total):
  Granola:    granola_user, granola_note, granola_calendar_event,
              granola_transcript_entry, granola_integration
  Greenhouse: greenhouse_job, greenhouse_candidate, greenhouse_interview,
              greenhouse_scorecard, greenhouse_granola_imported_note

TODO: Implement all functions below.
"""
import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent / "app.db"


def get_db() -> sqlite3.Connection:
    """Get a database connection with Row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """
    Create all tables and seed with mock data.
    Called once on app startup. Should be idempotent (use IF NOT EXISTS).
    """
    conn = get_db()
    c = conn.cursor()

    c.executescript("""
        CREATE TABLE IF NOT EXISTS granola_user (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS granola_note (
            id TEXT PRIMARY KEY,
            user_id INTEGER REFERENCES granola_user(id),
            title TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            attendees_json TEXT,
            summary_text TEXT,
            summary_markdown TEXT,
            sent_to_greenhouse BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS granola_calendar_event (
            id INTEGER PRIMARY KEY,
            note_id TEXT REFERENCES granola_note(id),
            event_title TEXT NOT NULL,
            organiser TEXT NOT NULL,
            invitees_json TEXT,
            scheduled_start_time TEXT NOT NULL,
            scheduled_end_time TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS granola_transcript_entry (
            id INTEGER PRIMARY KEY,
            note_id TEXT REFERENCES granola_note(id),
            speaker_source TEXT NOT NULL,
            text TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS granola_integration (
            id INTEGER PRIMARY KEY,
            user_id INTEGER REFERENCES granola_user(id),
            provider TEXT NOT NULL,
            connected BOOLEAN DEFAULT FALSE,
            connected_at TEXT
        );

        CREATE TABLE IF NOT EXISTS greenhouse_job (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            department TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS greenhouse_candidate (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            job_id INTEGER REFERENCES greenhouse_job(id)
        );

        CREATE TABLE IF NOT EXISTS greenhouse_interview (
            id INTEGER PRIMARY KEY,
            candidate_id INTEGER REFERENCES greenhouse_candidate(id),
            job_id INTEGER REFERENCES greenhouse_job(id),
            stage_name TEXT NOT NULL,
            interviewer_name TEXT NOT NULL,
            scheduled_start TEXT NOT NULL,
            scheduled_end TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS greenhouse_scorecard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_id INTEGER REFERENCES greenhouse_interview(id),
            candidate_id INTEGER REFERENCES greenhouse_candidate(id),
            interviewer_name TEXT,
            status TEXT DEFAULT 'pending',
            submitted_at TEXT,
            overall_recommendation TEXT,
            key_takeaways TEXT DEFAULT '',
            notes TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS greenhouse_granola_imported_note (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER REFERENCES greenhouse_candidate(id),
            interview_id INTEGER REFERENCES greenhouse_interview(id),
            granola_note_id TEXT NOT NULL,
            summary_markdown TEXT,
            summary_text TEXT,
            transcript_json TEXT,
            imported_at TEXT NOT NULL
        );
    """)

    # Idempotent seed: only insert if no user exists yet
    if c.execute("SELECT id FROM granola_user WHERE id = 1").fetchone():
        conn.close()
        return

    # ── Granola user + integration ──────────────────────────────────────────
    c.execute("INSERT INTO granola_user (id, name, email) VALUES (1, 'Harsh Mehta', 'harsh@company.com')")
    c.execute("""
        INSERT INTO granola_integration (id, user_id, provider, connected, connected_at)
        VALUES
            (1, 1, 'slack', FALSE, NULL),
            (2, 1, 'attio', FALSE, NULL),
            (3, 1, 'zapier', FALSE, NULL),
            (4, 1, 'hubspot', FALSE, NULL),
            (5, 1, 'greenhouse', FALSE, NULL)
    """)

    # ── Granola notes ────────────────────────────────────────────────────────
    ryan_summary_text = (
        "Ryan Gosling demonstrated strong technical fundamentals throughout the interview. "
        "He showed deep familiarity with React's component model and hooks, articulating "
        "clear reasoning about when to lift state vs use context. His system design approach "
        "for a real-time notification service was methodical — he identified the core scaling "
        "constraints early and proposed a sensible pub/sub architecture. When probed on "
        "trade-offs between WebSockets and SSE, he gave a nuanced answer that reflected real "
        "production experience. He asked good questions about the team's current stack and "
        "deployment practices. Overall a strong signal for the role."
    )
    ryan_summary_md = """\
## Summary

Ryan Gosling demonstrated strong technical fundamentals throughout the interview.

### Technical Skills
- Deep familiarity with **React hooks and component architecture** — articulated clear reasoning on state management patterns
- Solid system design instincts: proposed a pub/sub architecture for a real-time notification service, identified scaling constraints early
- Nuanced understanding of WebSockets vs SSE trade-offs, grounded in production experience

### Communication
- Answered questions clearly and concisely
- Asked thoughtful questions about the team's stack and deployment practices

### Overall
Strong signal for the Product Engineer role. Recommended to move forward."""

    dakota_summary_text = (
        "Jessica Chastain showed strong product instincts and communication skills. She walked through "
        "her work on a B2B SaaS dashboard in detail, explaining how she balanced competing "
        "priorities from engineering and design stakeholders. Her thinking on user research was "
        "practical — she described a lightweight usability testing process she ran with five users "
        "that caught a critical navigation issue before launch. Technically she's solid on the "
        "frontend but acknowledged gaps in backend architecture. She asked thoughtful questions "
        "about how product and engineering collaborate at the company. A good fit for the "
        "product-facing aspects of this engineer role."
    )
    dakota_summary_md = """\
## Summary

Jessica Chastain showed strong product instincts and practical execution skills.

### Product Thinking
- Walked through a **B2B SaaS dashboard project** end-to-end: scoping, stakeholder alignment, delivery
- Ran lightweight usability testing (5 users) that caught a critical navigation flaw pre-launch
- Balanced competing priorities between engineering and design stakeholders effectively

### Technical Skills
- Strong frontend fundamentals
- Self-aware about backend architecture gaps — acknowledged and described how she mitigates this

### Communication
- Clear, structured answers
- Asked thoughtful questions about product/engineering collaboration model

### Overall
Good fit for the product-facing aspects of the role. Recommend moving to next round."""

    standup_summary_text = (
        "Sprint planning update. Team reviewed current sprint velocity and adjusted scope for "
        "the upcoming release. Key blockers: API rate limiting issue on the data ingestion "
        "pipeline, pending design review for the new onboarding flow. Action items assigned."
    )
    standup_summary_md = """\
## Engineering Standup — Mar 26

### Sprint Update
- Current velocity on track for release
- Scope adjusted: pushed onboarding v2 to next sprint

### Blockers
- **API rate limiting** on data ingestion pipeline — Marcus investigating
- Design review pending for new onboarding flow

### Action Items
- Marcus: investigate rate limiting fix by EOD
- Priya: schedule design review for onboarding flow"""

    c.executemany(
        """INSERT INTO granola_note
           (id, user_id, title, created_at, updated_at, attendees_json,
            summary_text, summary_markdown, sent_to_greenhouse)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (
                "note_rg_001", 1,
                "Interview: Ryan Gosling — Product Engineer",
                "2026-03-25T14:00:00Z", "2026-03-25T15:05:00Z",
                json.dumps([{"name": "Ryan Gosling", "email": "ryan.gosling@email.com"},
                            {"name": "Harsh Mehta", "email": "harsh@company.com"}]),
                ryan_summary_text, ryan_summary_md, False,
            ),
            (
                "note_dj_002", 1,
                "Interview: Jessica Chastain — Product Engineer",
                "2026-03-24T10:00:00Z", "2026-03-24T11:10:00Z",
                json.dumps([{"name": "Jessica Chastain", "email": "jessica.chastain@email.com"},
                            {"name": "Harsh Mehta", "email": "harsh@company.com"}]),
                dakota_summary_text, dakota_summary_md, False,
            ),
            (
                "note_standup_003", 1,
                "Standup",
                "2026-03-26T09:30:00Z", "2026-03-26T09:50:00Z",
                json.dumps([{"name": "Harsh Mehta",  "email": "harsh@company.com"},
                            {"name": "Marcus Lee",   "email": "marcus@company.com"},
                            {"name": "Priya Nair",   "email": "priya@company.com"}]),
                standup_summary_text, standup_summary_md, False,
            ),
        ],
    )

    # ── Calendar events ──────────────────────────────────────────────────────
    c.executemany(
        """INSERT INTO granola_calendar_event
           (id, note_id, event_title, organiser, invitees_json,
            scheduled_start_time, scheduled_end_time)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        [
            (1, "note_rg_001",
             "Interview: Ryan Gosling — Product Engineer", "harsh@company.com",
             json.dumps([{"email": "ryan.gosling@email.com"}]),
             "2026-03-25T14:00:00Z", "2026-03-25T15:00:00Z"),
            (2, "note_dj_002",
             "Interview: Jessica Chastain — Product Engineer", "harsh@company.com",
             json.dumps([{"email": "jessica.chastain@email.com"}]),
             "2026-03-24T10:00:00Z", "2026-03-24T11:00:00Z"),
            (3, "note_standup_003",
             "Standup", "marcus@company.com",
             json.dumps([{"email": "harsh@company.com"}, {"email": "priya@company.com"}]),
             "2026-03-26T09:30:00Z", "2026-03-26T09:50:00Z"),
        ],
    )

    # ── Transcript entries ───────────────────────────────────────────────────
    raw_entries = [
        # Ryan Gosling — 10 entries (technical interview)
        ("note_rg_001", "microphone",
         "Hi Ryan, thanks for joining. Let's dive right in — can you walk me through how you think about state management in a large React application?",
         "00:00:30", "00:00:45"),
        ("note_rg_001", "speaker",
         "Sure. My default is to keep state as local as possible — if it's only used in one component, it stays there. I reach for context when I need to share state across a subtree without prop drilling. For truly global state like auth or user preferences, I've used Zustand recently and really like how lightweight it is compared to Redux.",
         "00:00:46", "00:01:20"),
        ("note_rg_001", "microphone",
         "What made you move away from Redux?",
         "00:01:22", "00:01:28"),
        ("note_rg_001", "speaker",
         "Mostly boilerplate. Redux Toolkit helped but for most apps the overhead isn't worth it. Zustand gives you a simple store with minimal setup. I'd still use Redux on a team that already has it, but wouldn't choose it greenfield.",
         "00:01:29", "00:02:00"),
        ("note_rg_001", "microphone",
         "Let's do a system design question. Design a real-time notification service that needs to push updates to a million concurrent users.",
         "00:02:10", "00:02:22"),
        ("note_rg_001", "speaker",
         "Okay. First constraint I'd clarify — are these per-user targeted notifications or broadcast? Assuming per-user. At that scale you can't hold a million WebSocket connections on a single server, so you'd shard by user ID across a pool of connection servers. Each server maintains the open connections for its shard. Behind them you'd have a pub/sub layer — Kafka or Redis Streams — where your app services publish events. Connection servers subscribe to the relevant topics and forward to the connected clients.",
         "00:02:25", "00:03:40"),
        ("note_rg_001", "microphone",
         "Why Kafka over Redis Pub/Sub for the message layer?",
         "00:03:42", "00:03:50"),
        ("note_rg_001", "speaker",
         "Durability and replay. Redis Pub/Sub is fire-and-forget — if a connection server goes down, those messages are lost. Kafka persists them so you can replay missed notifications. For a notification system that's usually worth the operational cost. Though if you're okay with some loss and need lower latency, Redis Streams is a reasonable middle ground.",
         "00:03:51", "00:04:30"),
        ("note_rg_001", "microphone",
         "That's a solid answer. What's a mistake you've made in production and what did you learn from it?",
         "00:04:35", "00:04:45"),
        ("note_rg_001", "speaker",
         "I once over-optimized a React component with useMemo on everything. It actually made performance worse because the memoization overhead was higher than the re-render cost. Taught me to measure first, optimize second. Now I use the Profiler tab before touching memo.",
         "00:04:47", "00:05:20"),

        # Jessica Chastain — 10 entries (product thinking interview)
        ("note_dj_002", "microphone",
         "Jessica, tell me about a product you're proud of shipping. Walk me through how you went from problem to solution.",
         "00:00:30", "00:00:42"),
        ("note_dj_002", "speaker",
         "The one I'm most proud of is a reporting dashboard I built at my last company for B2B customers. The original version was a table dump — totally unusable. I talked to five customers and found they all cared about the same three metrics but couldn't find them.",
         "00:00:44", "00:01:30"),
        ("note_dj_002", "microphone",
         "How did you decide what to build once you had that insight?",
         "00:01:32", "00:01:40"),
        ("note_dj_002", "speaker",
         "I did a quick wireframe, put it in front of the same five customers, and asked them to find their key metric. Three of them couldn't. So I rethought the information hierarchy — made the three core metrics the first thing you see, everything else behind a details view. Second round of testing, all five completed the task in under ten seconds.",
         "00:01:42", "00:02:30"),
        ("note_dj_002", "microphone",
         "You're an engineer — how did you balance your own instincts about what's technically easier versus what users needed?",
         "00:02:35", "00:02:48"),
        ("note_dj_002", "speaker",
         "There was definitely tension. The design called for a custom chart component that I knew would take two weeks. I pushed back and proposed using an existing charting library with some custom theming — got it down to three days and users couldn't tell the difference. Good engineering is knowing when the 'right' solution isn't worth the cost.",
         "00:02:50", "00:03:35"),
        ("note_dj_002", "microphone",
         "What are your gaps technically? Be honest.",
         "00:03:40", "00:03:47"),
        ("note_dj_002", "speaker",
         "Backend architecture is where I'm weakest. I can write APIs and work with databases but I wouldn't be comfortable designing a distributed system from scratch. I compensate by asking backend engineers the right questions and being honest about what I don't know. I've been going through system design resources in my spare time.",
         "00:03:49", "00:04:30"),
        ("note_dj_002", "microphone",
         "How do product and engineering collaborate where you are now?",
         "00:04:35", "00:04:42"),
        ("note_dj_002", "speaker",
         "Reasonably well but there's room to improve. PMs write specs but engineers don't always get early input on feasibility. I've been trying to close that gap by joining discovery sessions earlier. It catches scope issues before they become sprint problems.",
         "00:04:44", "00:05:10"),

        # Engineering Standup — 4 entries
        ("note_standup_003", "microphone",
         "Alright, quick round. Marcus, what's the status on the data ingestion pipeline?",
         "00:00:15", "00:00:22"),
        ("note_standup_003", "speaker",
         "Still hitting rate limits on the third-party API. I've got a fix drafted — exponential backoff with jitter — but I want to test it in staging before merging. PR up by EOD.",
         "00:00:23", "00:00:45"),
        ("note_standup_003", "microphone",
         "Priya, onboarding flow design review — where are we?",
         "00:00:47", "00:00:53"),
        ("note_standup_003", "speaker",
         "Blocked waiting on final copy from marketing. Once I have that I can finish the mockups and get them in front of the team. Probably Thursday at the earliest.",
         "00:00:55", "00:01:15"),
    ]

    c.executemany(
        """INSERT INTO granola_transcript_entry
           (id, note_id, speaker_source, text, start_time, end_time)
           VALUES (?, ?, ?, ?, ?, ?)""",
        [(i + 1, note_id, speaker, text, start, end)
         for i, (note_id, speaker, text, start, end) in enumerate(raw_entries)],
    )

    # ── Greenhouse data ──────────────────────────────────────────────────────
    c.execute("INSERT INTO greenhouse_job (id, title, department) VALUES (1, 'Product Engineer', 'Engineering')")

    c.executemany(
        "INSERT INTO greenhouse_candidate (id, name, email, status, job_id) VALUES (?, ?, ?, ?, ?)",
        [
            (1, "Ryan Gosling",    "ryan.gosling@email.com",    "active", 1),
            (2, "Jessica Chastain",  "jessica.chastain@email.com",  "active", 1),
            (3, "Maria Garcia",    "maria.garcia@email.com",    "active", 1),
        ],
    )

    c.executemany(
        """INSERT INTO greenhouse_interview
           (id, candidate_id, job_id, stage_name, interviewer_name, scheduled_start, scheduled_end)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        [
            (1, 1, 1, "Technical Interview", "Harsh Mehta", "2026-03-25T14:00:00Z", "2026-03-25T15:00:00Z"),
            (2, 2, 1, "Technical Interview", "Harsh Mehta", "2026-03-24T10:00:00Z", "2026-03-24T11:00:00Z"),
            (3, 3, 1, "Technical Interview", "Harsh Mehta", "2026-03-28T13:00:00Z", "2026-03-28T14:00:00Z"),
        ],
    )

    conn.commit()
    conn.close()