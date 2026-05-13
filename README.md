<p align="center">
  <strong>LAUNCH.PAD</strong>
</p>

<p align="center">
  The command center for indie product builders.<br/>
  Promote. Monitor. Analyze. Ship faster.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.136-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python" alt="Python" />
</p>

<p align="center">
  <a href="docs/API_REFERENCE.md">API Reference</a> &#8226;
  <a href="docs/specs/TECHNICAL_SPEC.md">Technical Spec</a> &#8226;
  <a href="backend/.env.example">Environment Setup</a>
</p>

---

## What is LaunchPad?

LaunchPad is a SaaS platform where indie hackers manage everything about their product from a single dashboard:

- **AI Promotion** -- Generate and publish posts to X and Threads with AI. Scheduled posting, engagement tracking.
- **Deploy Monitoring** -- Connect Vercel/Railway. Get alerts on failures. AI analyzes error logs, traces through source code, and tells you exactly what broke and how to fix it.
- **Market Intelligence** -- Daily competitor analysis and trend reports powered by Gemini with real-time web search.
- **GitHub Integration** -- Issues sync, commit tracking, auto-generate promotion drafts from pushes.
- **Smart Insights** -- Optimal posting time, weekly reports, anomaly detection -- all from your own data.

> Built by **Team A** at **Korea University NEXT Startup Club**

---

## Architecture

```
Frontend (Next.js 16)          Backend (FastAPI)
     |                              |
     |  REST API                    |--- Gemini AI (promotion, insights, error analysis)
     |                              |--- X API v2 (OAuth, post, metrics)
     v                              |--- Threads API (OAuth, post, insights)
  Supabase                          |--- GitHub API (OAuth, repo, webhooks, file content)
  (PostgreSQL + Auth + Realtime)    |--- Vercel API (OAuth, deployments, log drain)
                                    |--- Railway API (OAuth, GraphQL deployments)
                                    |
                                    |--- APScheduler
                                         |-- SNS metrics sync (30min, tiered)
                                         |-- Scheduled post publisher (5min)
                                         |-- Token refresh (1hr)
                                         |-- Market insights (daily 8:00 UTC)
                                         |-- Weekly report (Mon 9:00 UTC)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion |
| Backend | FastAPI, Python 3.11+, Pydantic, APScheduler |
| Database | Supabase (PostgreSQL 15+, RLS, Realtime) |
| Auth | Supabase Auth (Google OAuth) + per-service OAuth (X, Threads, GitHub, Vercel, Railway) |
| AI | Google Gemini 2.5 Flash (structured output, search grounding) |
| Deploy | Vercel (frontend) + Railway (backend) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase project with Google OAuth enabled

### 1. Clone

```bash
git clone https://github.com/Next-TeamA/indie-product-hub.git
cd indie-product-hub
```

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# Fill in your credentials (see Environment Variables below)

uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in Supabase URL, Anon Key, API URL

npm run dev
```

### 4. Database

Run migrations in **Supabase SQL Editor**:

```
backend/supabase/schema.sql              -- Base schema
backend/supabase/migrations/001_extend_schema.sql    -- Extended tables
backend/supabase/migrations/002_oauth_states_and_fixes.sql  -- OAuth + fixes
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Where to get it |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase Dashboard > Settings > API |
| `SUPABASE_KEY` | Yes | Supabase Dashboard > Settings > API (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase Dashboard > Settings > API |
| `SUPABASE_JWT_SECRET` | Yes | Supabase Dashboard > Settings > API > JWT Secret |
| `GEMINI_API_KEY` | Yes | https://aistudio.google.com/apikey |
| `ENCRYPTION_KEY` | Yes | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `X_CLIENT_ID` | For X integration | https://developer.x.com |
| `X_CLIENT_SECRET` | For X integration | Same |
| `THREADS_APP_ID` | For Threads | https://developers.facebook.com |
| `THREADS_CLIENT_SECRET` | For Threads | Same |
| `GITHUB_CLIENT_ID` | For GitHub | https://github.com/settings/developers |
| `GITHUB_CLIENT_SECRET` | For GitHub | Same |
| `VERCEL_CLIENT_ID` | For Vercel | https://vercel.com/account/integrations |
| `VERCEL_CLIENT_SECRET` | For Vercel | Same |
| `RAILWAY_CLIENT_ID` | For Railway | Railway Workspace > Developer |
| `RAILWAY_CLIENT_SECRET` | For Railway | Same |

### Frontend (`frontend/.env.local`)

| Variable | Required | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Dashboard |
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL (default: `http://localhost:8000`) |

---

## API Overview

**40+ endpoints** across 14 routers. Full docs: [API_REFERENCE.md](docs/API_REFERENCE.md)

| Category | Endpoints | Description |
|---|---|---|
| Projects | 5 | CRUD for indie products |
| Events | 4 | Calendar event management |
| Issues | 4 | Issue tracking (manual + auto-created) |
| Promotion | 9 | AI content generation, post management, SNS publishing |
| Insights | 2 | Marketing analytics, operations overview |
| Market Insights | 3 | AI competitor/trend analysis with web search |
| SNS Metrics | 6 | X and Threads engagement data |
| Accounts | 4 | OAuth connect/disconnect for 5 services |
| Alerts | 3 | Notification management |
| Deployments | 2 | Deploy log tracking + sync |
| Automation | 4 | Optimal time, weekly report, GitHub sync, error analysis |
| Webhooks | 3 | GitHub, Vercel, Railway event receivers |
| Log Drain | 1 | Real-time Vercel runtime error detection |
| Health | 1 | Health check |

---

## Key Automations

| Trigger | What happens | User action needed |
|---|---|---|
| GitHub push (feat/fix) | AI generates promotion draft | Review and publish |
| Deploy fails | Issue created + alert | Fix the bug |
| Runtime errors detected | AI traces through source code + commit diffs, identifies root cause | Apply the fix |
| Every 30 min | SNS metrics synced (cost-optimized tiered) | None |
| Every day 8:00 UTC | Market insights generated (Gemini + web search) | Read and act |
| Every Monday 9:00 UTC | Weekly report generated | Review |
| OAuth token expiring | Auto-refreshed | None |
| Scheduled post time reached | Published to X/Threads | None |

---

## Project Structure

```
indie-product-hub/
  frontend/                    Next.js 16 + TypeScript
    src/app/                   App Router pages
    src/components/            UI components
    src/lib/                   API clients, Supabase, utils

  backend/                     FastAPI + Python
    app/
      api/routes/              14 route modules (40+ endpoints)
      api/dependencies/        Auth, project access verification
      core/                    Config, encryption, rate limiting
      integrations/            X, Threads, GitHub, Vercel, Railway, Gemini
      services/                Automation, insights, error analysis
      workers/tasks/           Background jobs (5 scheduled tasks)
      models/                  Pydantic schemas
    supabase/                  Schema + migrations

  docs/
    API_REFERENCE.md           Complete endpoint documentation
    specs/TECHNICAL_SPEC.md    Architecture and design decisions
```

---

## Team

**Korea University NEXT Startup Club -- Team A**

| Name | Role | GitHub |
|---|---|---|
| **Lee Seongmin** | Backend / Architecture | [@danlee-dev](https://github.com/danlee-dev) |
| **Park Bogyeom** | Frontend / Design | [@kkum2](https://github.com/kkum2) |
| **Jeong Hyeongsik** | Frontend | [@hyeongsigjo40-jpg](https://github.com/hyeongsigjo40-jpg) |
| **Kwak Minji** | Frontend | [@kwakminji](https://github.com/kwakminji) |

---

## License

MIT
