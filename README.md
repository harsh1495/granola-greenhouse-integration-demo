# Granola × Greenhouse: Scorecard Autofill

A prototype demonstrating how [Granola](https://granola.ai) could natively integrate with [Greenhouse](https://greenhouse.com) to auto-fill interview scorecards — replacing dedicated interview intelligence tools like BrightHire.

## The Idea

Recruiting teams pay for two tools: an ATS (Greenhouse) for managing candidates and scorecards, and an interview intelligence tool (BrightHire) for recording interviews and auto-filling those scorecards. BrightHire requires a bot in the call and costs significant per-seat fees.

Granola already does bot-free transcription and AI notes for $14/month. This project closes the gap: getting Granola notes into Greenhouse scorecards.

## Demo Flow

1. **Granola clone** → View interview notes
2. **Settings → Integrations → Greenhouse** → Connect (simulated OAuth)
3. **Open a note** → Click "Send to Greenhouse"
4. **Switch to Greenhouse clone** → Open candidate's interview kit
5. **Scorecard tab** → Granola autofill banner appears
6. **Click "Autofill scorecard"** → Notes populated from Granola
7. **Review, edit, submit**

## Tech Stack

- **Frontend:** React (Vite) + CSS Modules
- **Backend:** Python FastAPI + SQLite
- **Deployment:** Replit (single port)

## Setup

### Local Development

```bash
# Backend
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd client
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to the FastAPI server.

### Replit

The `.replit` file is configured to run the FastAPI server.
Build the frontend first: `cd client && npm run build`

### Production Build

```bash
cd client && npm run build
# FastAPI serves the built React app from client/dist/
cd ../server && uvicorn main:app --host 0.0.0.0 --port 8000
```

## Project Structure

```
├── recipe/                      # Granola Recipe prompt
├── server/
│   ├── main.py                  # FastAPI routes
│   ├── models.py                # Pydantic models
│   ├── database.py              # SQLite schema + queries
│   └── requirements.txt
├── client/
│   ├── src/
│   │   ├── granola/             # Granola clone (5 pages)
│   │   ├── greenhouse/          # Greenhouse clone (3 pages)
│   │   ├── components/          # Shared (OAuth page)
│   │   └── styles/              # Global CSS
│   └── vite.config.js
└── .replit
```

## API

### Granola
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/granola/notes` | List notes |
| GET | `/api/granola/notes/:id` | Note detail + transcript |
| POST | `/api/granola/notes/:id/send-to-greenhouse` | Push note to Greenhouse |

### Greenhouse
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/greenhouse/interviews` | List interviews |
| GET | `/api/greenhouse/interviews/:id` | Interview detail |
| GET | `/api/greenhouse/interviews/:id/scorecard` | Get scorecard |
| POST | `/api/greenhouse/interviews/:id/scorecard` | Submit scorecard |
| POST | `/api/greenhouse/interviews/:id/autofill` | Get Granola data for autofill |

### Integration
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/integration/status` | Connection status |
| GET | `/api/integration/authorize` | OAuth sim page |
| POST | `/api/integration/authorize/confirm` | Confirm OAuth |
| POST | `/api/integration/disconnect` | Disconnect |
