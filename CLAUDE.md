# LaunchPad -- Project Guide for AI Assistants

## What is LaunchPad

SaaS dashboard for indie product builders. Manages projects, monitors deployments, generates AI-powered SNS promotions, and provides market insights. Multi-user, per-project OAuth integrations.

## Monorepo Structure

```
frontend/          -- Next.js 16 + Tailwind CSS + Motion
backend/           -- FastAPI + Supabase + Gemini AI
docs/              -- Enhancement docs, promotion templates
  ENHANCEMENTS.md  -- Full feature documentation (READ THIS FIRST)
  promotion/       -- SNS promotion knowledge base (6 files)
```

## Backend Architecture

```
backend/app/
  main.py                 -- FastAPI app, router registration, lifespan
  core/
    config.py             -- Settings (env vars)
    supabase.py           -- Supabase client + safe_maybe_single() utility
    encryption.py         -- Fernet token encryption
    exceptions.py         -- Custom error classes
    rate_limit.py         -- slowapi rate limiter
  api/routes/
    projects.py           -- CRUD + workspace init on create
    promotion.py          -- AI generation + CRUD + publish to X/Threads
    accounts.py           -- OAuth flows + service listing (repos, projects)
    agent.py              -- POST /projects/{id}/agent/run
    insights.py           -- Marketing + operations insights
    market_insights.py    -- Market intelligence with web search
    issues.py, events.py, deployments.py, alerts.py
    webhooks.py           -- GitHub/Vercel/Railway webhook handlers
    log_drain.py          -- Vercel runtime error detection
    settings.py           -- Global user settings
    sns_metrics.py        -- X/Threads metrics API
  integrations/
    gemini.py             -- Google Gemini wrapper (generate_text, generate_json)
    github_api.py         -- GitHub REST API (repos, commits, PRs, code, CI)
    vercel_api.py         -- Vercel API (deploys, logs)
    railway_api.py        -- Railway GraphQL API
    x_api.py              -- X/Twitter API (OAuth, post, metrics)
    threads_api.py        -- Threads API (OAuth, post, insights)
  agents/
    core.py               -- Skill-based agent loop (run_agent, build_agent_context)
    context.py            -- AgentContext, AgentResult dataclasses
    prompts.py            -- Deprecated (skills replaced this)
    tools/                -- 31 agent tools across 6 domains
      registry.py         -- Tool registration system
      github_tools.py     -- 7 GitHub tools
      deploy_tools.py     -- 5 deploy tools
      sns_tools.py        -- 9 SNS tools (includes promotion_references)
      market_tools.py     -- 3 market tools (web search)
      knowledge_tools.py  -- 3 knowledge base tools
      internal_tools.py   -- 4 internal tools (issues, alerts, summary)
  workspace/
    storage.py            -- Supabase Storage read/write for workspace files
    skill_loader.py       -- Parse skill markdown frontmatter + body
    skill_router.py       -- Auto-select skills by task keyword matching
    workspace_init.py     -- Create workspace folder on project creation
    default_skills/       -- 7 skill files (promotion, deploy, code, market, report, health, search)
  services/
    insight_engine.py     -- Marketing insights from stored SNS data
    deploy_analysis.py    -- Deploy error analysis (Gemini + logs)
    deep_analysis.py      -- Code-level error tracing (GitHub code + diffs)
    automation.py         -- Auto promo from push, weekly reports, issue creation
  workers/
    scheduler.py          -- APScheduler with 8 periodic tasks
    tasks/
      sync_knowledge.py   -- 6h: sync GitHub/deploy/SNS/market to knowledge files
      sync_sns_metrics.py -- 30min: collect X/Threads metrics + detect deleted posts
      publish_scheduled.py -- 5min: publish scheduled promotion posts
      refresh_tokens.py   -- 1h: refresh expiring OAuth tokens
      agent_tasks.py      -- Daily: agent health check per project
      smart_sync.py       -- Tiered SNS sync + daily market insights
      weekly_report.py    -- Monday: weekly project report
      cleanup.py          -- 1h: remove expired OAuth states
```

## Skill-Based Agent System

The agent uses file-based skills instead of hardcoded prompts. Each skill file is a markdown document with frontmatter metadata:

- Location: `backend/app/workspace/default_skills/*.md`
- 7 skills: promotion, deploy_analysis, deep_code_analysis, market_research, weekly_report, health_check, web_search
- All LLM calls load prompts via `get_skill_prompt("skill_name")` from `workspace/skill_loader.py`
- SkillRouter auto-selects skills by matching task keywords to trigger lists
- Agent can load additional skills mid-loop via `load_additional_skill` tool
- Per-project workspaces in Supabase Storage: `workspaces/{project_id}/`

## Frontend Architecture

```
frontend/src/
  app/
    page.tsx              -- Landing page (Korean, center-to-split animation)
    login/page.tsx        -- Google OAuth login
    auth/callback/        -- Supabase auth callback
    projects/
      page.tsx            -- Project list + calendar + user menu
      new/page.tsx        -- 4-step onboarding (PRD -> GitHub -> Deploy -> SNS)
      [id]/
        page.tsx          -- Dashboard (insights, promotion stats, issues)
        promotion/        -- Calendar view + post editor with AI generation
        insights/         -- Marketing + operations + market news
        issues/           -- Deploy logs + service health + issue list
        settings/         -- Per-project service connections
    settings/page.tsx     -- Global user settings
  components/
    landing/              -- Landing page component
    layout/               -- ProjectSidebar
    onboarding/           -- PrdStep, GithubStep, DeployStep, SnsStep, CompleteStep
  hooks/                  -- SWR hooks (useProjects, useIssues, etc.)
  lib/
    api/                  -- API client functions (projects, accounts, promotion, etc.)
    supabase/             -- Supabase client + middleware (auth)
```

## Database (Supabase)

Key tables: projects, connected_accounts, promotion_posts, promotion_references, project_promotion_info, project_knowledge, sns_metrics_snapshots, deployment_logs, issues, alerts, market_insights, events, oauth_states

Migrations: `backend/supabase/migrations/001-006*.sql`

## Important Patterns

- **safe_maybe_single()**: Always use `from app.core.supabase import safe_maybe_single` for `.maybe_single()` queries. Never call `.maybe_single().execute()` directly.
- **Skill prompts**: Use `get_skill_prompt("name")` instead of hardcoding system prompts.
- **OAuth flow**: Backend stores `return_to` in OAuth state for redirect back to original page.
- **Workspace**: Projects auto-create workspace on creation. Knowledge syncs every 6h to both DB and Storage.

## Environment

- Backend: Railway (Python 3.11, uvicorn)
- Frontend: Vercel (Next.js 16, pnpm)
- DB: Supabase (PostgreSQL + Storage + Auth)
- AI: Google Gemini 2.5 Flash
- OAuth: GitHub, Vercel (Integration), X, Threads, Railway

## Common Tasks

- Add new skill: create `.md` file in `backend/app/workspace/default_skills/` with frontmatter
- Add new tool: register in `backend/app/agents/tools/`, call `register_tool()` in the `register_*_tools()` function
- Add new API route: create in `backend/app/api/routes/`, register in `main.py`
- Add new scheduled task: create in `backend/app/workers/tasks/`, register in `scheduler.py`
