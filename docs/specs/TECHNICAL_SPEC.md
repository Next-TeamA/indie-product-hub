# Indie Product Hub - Technical Specification

Version: 1.0
Last Updated: 2026-05-12
Status: Draft

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Database Design (Supabase)](#3-database-design-supabase)
4. [Backend Architecture (FastAPI)](#4-backend-architecture-fastapi)
5. [Frontend Architecture (Next.js)](#5-frontend-architecture-nextjs)
6. [Authentication and Authorization](#6-authentication-and-authorization)
7. [External API Integrations](#7-external-api-integrations)
8. [AI/LLM Features](#8-aillm-features)
9. [Real-time and Notification System](#9-real-time-and-notification-system)
10. [Design System](#10-design-system)
11. [Motion and Interaction Design](#11-motion-and-interaction-design)
12. [Performance Optimization](#12-performance-optimization)
13. [Security](#13-security)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Phase Roadmap](#15-phase-roadmap)

---

## 1. Product Overview

### 1.1 What It Is

Indie Product Hub는 인디 해커/메이커가 자신의 프로덕트를 **한 곳에서** 관리하는 운영 대시보드다. 단순 프로젝트 관리 도구가 아니라, 마케팅 실행 + 시장 분석 + 배포 모니터링 + AI 인사이트를 통합한 **프로덕트 운영 허브**.

### 1.2 Core Value Propositions

- 프로모션 콘텐츠를 AI로 생성하고, X/Threads에 직접 게시하고, 성과를 추적
- 경쟁사/시장 동향을 자동 수집하고 분석해서 리포팅
- 배포된 프로덕트의 에러 로그, 트래픽 변화를 실시간 모니터링하고 긴급 알림
- GitHub 레포 연동으로 개발 진행상황과 이슈를 대시보드에서 통합 관리

### 1.3 User Persona

- 인디 해커 / 사이드 프로젝트 운영자
- 1인 또는 소규모 (2-3인) 팀
- 기술적 배경 있음 (개발자)
- 마케팅은 직접 하지만 시간이 부족
- 여러 플랫폼 (X, Threads, GitHub, Vercel/Railway)을 오가며 관리하는 게 비효율적

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
[Browser / Next.js Frontend]
        |
        | HTTPS (REST API)
        v
[FastAPI Backend]  <-->  [Supabase PostgreSQL + Auth + Realtime + Storage]
        |
        |--- [Google Gemini API] (LLM - promotion, insights)
        |--- [X API v2] (OAuth + post + metrics)
        |--- [Threads API v1.0] (OAuth + post + metrics)
        |--- [GitHub REST API] (OAuth + repo + webhooks)
        |--- [Vercel API] (OAuth + deployments + drains)
        |--- [Railway GraphQL API] (OAuth + deployments + metrics)
        |
        |--- [Background Workers] (Celery + Redis or Supabase Edge Functions)
        |        |--- SNS metrics polling
        |        |--- Market insight crawling
        |        |--- Token refresh jobs
        |        |--- Scheduled post publishing
        |
        v
[Supabase Realtime]  --->  [Frontend WebSocket] (alerts, live updates)
```

### 2.2 Tech Stack Summary

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript | App Router, SSR/SSG, middleware |
| Styling | Tailwind CSS v4 + shadcn/ui | Semantic tokens, dark/light |
| Animation | motion (Framer Motion v12) | Spring physics, gesture, layout |
| Backend | FastAPI + Python 3.11+ | Async native, Pydantic validation |
| Database | Supabase (PostgreSQL 15+) | RLS, Realtime, Auth, Storage, Edge Functions |
| Cache | Redis (via Upstash or Railway addon) | API response cache, rate limit counter, job queue |
| Background Jobs | Celery + Redis (or APScheduler for MVP) | Periodic SNS polling, market crawl, scheduled posts |
| LLM | Google Gemini 2.5 Flash/Pro | Promotion writing, market analysis, insight generation |
| Auth | Supabase Auth (Google OAuth) + per-service OAuth | Single sign-on + service-specific token management |
| Deployment | Vercel (frontend) + Railway (backend) | Auto-deploy from Git |

### 2.3 Monorepo Structure (Target)

```
indie-product-hub/
  frontend/                    # Next.js 16
    src/
      app/                     # App Router pages
      components/              # Shared UI components
      lib/                     # Utilities, API clients, hooks
      styles/                  # Design tokens, global CSS
    DESIGN.md                  # Design system spec
  backend/                     # FastAPI
    app/
      api/
        routes/                # API endpoints
        dependencies/          # Shared dependencies (auth, pagination)
      core/                    # Config, auth, DB client
      models/                  # Pydantic schemas (request/response)
      services/                # Business logic layer
      workers/                 # Background tasks
      integrations/            # External API wrappers (X, Threads, GitHub, Vercel, Railway)
    supabase/
      schema.sql               # Full DDL
      migrations/              # Incremental migrations
    tests/                     # pytest test suite
  docs/
    specs/                     # This document and others
  .github/
    workflows/                 # CI/CD
```

---

## 3. Database Design (Supabase)

### 3.1 Design Principles

- **RLS (Row Level Security)** on every table. 백엔드가 service_role_key를 써도 RLS는 논리적 경계로 유지
- **UUID v4** for all primary keys (Supabase default `gen_random_uuid()`)
- **timestamptz** for all timestamps (timezone-aware)
- **soft delete 미사용** -- hard delete + cascade. 인디 프로덕트에 soft delete 복잡성은 오버엔지니어링
- **JSONB** for flexible schema fields (SNS metrics snapshot, LLM prompt config)
- **Enum은 CHECK constraint**로 구현 (PostgreSQL native enum은 ALTER가 번거로움)
- **Index 전략**: 자주 쿼리되는 FK + status + created_at에 복합 인덱스
- **Trigger로 updated_at 자동 갱신** (이미 구현됨, 모든 mutable 테이블에 확장)

### 3.2 Entity Relationship

```
users (Supabase auth.users)
  |
  |-- 1:N -- projects
  |             |-- 1:N -- events
  |             |-- 1:N -- issues
  |             |-- 1:N -- promotion_posts
  |             |-- 1:1 -- project_promotion_info
  |             |-- 1:N -- promotion_metrics_snapshots
  |             |-- 1:N -- market_insights
  |             |-- 1:N -- deployment_logs
  |             |-- 1:N -- alerts
  |
  |-- 1:N -- connected_accounts (X, Threads, GitHub, Vercel, Railway)
  |-- 1:N -- notification_preferences
```

### 3.3 Full Schema

#### 3.3.1 projects

현재 스키마를 확장한다. 프로젝트의 메타정보 + 연동 상태를 한 테이블에서 관리.

```sql
CREATE TABLE public.projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  name          text NOT NULL,
  description   text,
  prd           text,                        -- Product Requirements Document (free text)
  logo_url      text,                        -- Supabase Storage URL

  -- Connections (어떤 서비스가 연결되어 있는지)
  github_repo_url      text,                 -- e.g. "https://github.com/user/repo"
  github_repo_owner    text,                 -- parsed: "user"
  github_repo_name     text,                 -- parsed: "repo"
  deploy_platform      text CHECK (deploy_platform IN ('vercel', 'railway', NULL)),
  deploy_project_id    text,                 -- Vercel project ID or Railway service ID
  deploy_url           text,                 -- Production URL

  -- SNS
  sns_channels         text[] DEFAULT '{}',  -- ["x", "threads"] 등록된 플랫폼 목록

  -- Status
  status        text NOT NULL DEFAULT 'preparing'
                CHECK (status IN ('preparing', 'active', 'paused', 'archived')),

  -- Timestamps
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_status ON public.projects(user_id, status);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### 3.3.2 connected_accounts

사용자별 외부 서비스 OAuth 토큰 관리. 프로젝트가 아닌 **사용자 레벨**로 관리 (하나의 X 계정을 여러 프로젝트에서 사용 가능).

```sql
CREATE TABLE public.connected_accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  provider          text NOT NULL CHECK (provider IN ('x', 'threads', 'github', 'vercel', 'railway')),

  -- OAuth tokens (encrypted at application level before storage)
  provider_user_id  text NOT NULL,             -- X user ID, Threads user ID, etc.
  provider_username text,                      -- @handle or display name
  access_token      text NOT NULL,             -- encrypted
  refresh_token     text,                      -- encrypted (nullable: some providers don't have)
  token_expires_at  timestamptz,               -- when access token expires
  scopes            text[],                    -- granted scopes

  -- Metadata
  profile_data      jsonb DEFAULT '{}',        -- avatar URL, follower count, etc.
  is_active         boolean NOT NULL DEFAULT true,
  last_synced_at    timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id, provider, provider_user_id)
);

CREATE INDEX idx_connected_accounts_user ON public.connected_accounts(user_id);
CREATE INDEX idx_connected_accounts_provider ON public.connected_accounts(user_id, provider);
CREATE INDEX idx_connected_accounts_token_expiry ON public.connected_accounts(token_expires_at)
  WHERE is_active = true;

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_accounts" ON public.connected_accounts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### 3.3.3 events (Calendar)

기존 스키마 유지 + 인덱스 보강.

```sql
CREATE TABLE public.events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title         text NOT NULL,
  event_type    text NOT NULL DEFAULT 'other'
                CHECK (event_type IN ('promotion', 'deployment', 'marketing', 'meeting', 'milestone', 'other')),
  date          date NOT NULL,
  time          time,
  description   text,

  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_project_date ON public.events(project_id, date);
CREATE INDEX idx_events_user ON public.events(user_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_events" ON public.events
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### 3.3.4 issues

기존 스키마 + source(수동/자동) 구분 추가.

```sql
CREATE TABLE public.issues (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title         text NOT NULL,
  description   text,
  severity      text NOT NULL DEFAULT 'warning'
                CHECK (severity IN ('critical', 'warning', 'info')),
  category      text NOT NULL DEFAULT 'general'
                CHECK (category IN ('security', 'performance', 'deployment', 'error', 'general')),
  status        text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'investigating', 'resolved')),

  -- Source tracking
  source        text NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual', 'vercel', 'railway', 'github', 'system')),
  source_ref    text,              -- external reference (Vercel deployment ID, GitHub issue URL, etc.)

  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_issues_project_status ON public.issues(project_id, status);
CREATE INDEX idx_issues_severity ON public.issues(project_id, severity) WHERE status != 'resolved';
CREATE INDEX idx_issues_user ON public.issues(user_id);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_issues" ON public.issues
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### 3.3.5 promotion_posts

기존 `promotion_messages` (채팅 히스토리) 대신, 실제 게시물 중심 모델로 전환. 하나의 포스트 = 하나의 SNS 게시물.

```sql
CREATE TABLE public.promotion_posts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  platform       text NOT NULL CHECK (platform IN ('x', 'threads', 'bluesky', 'mastodon')),
  hook           text,                         -- opening hook line
  content        text NOT NULL,                -- main body
  hashtags       text[] DEFAULT '{}',
  link           text,
  images         text[] DEFAULT '{}',          -- Supabase Storage URLs

  -- AI generation context
  ai_prompt      text,                         -- user's original prompt to AI
  ai_model       text,                         -- model used (gemini-2.5-flash, etc.)
  tone           text CHECK (tone IN ('friendly', 'professional', 'humorous', 'informative')),
  content_type   text CHECK (content_type IN ('launch', 'update', 'retrospective', 'qa', 'tip', 'milestone')),

  -- Scheduling and publishing
  status         text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at   timestamptz,                  -- when to publish (NULL = no schedule)
  published_at   timestamptz,                  -- actual publish time
  external_post_id text,                       -- X tweet ID or Threads media ID after publishing

  -- Error tracking
  publish_error  text,                         -- error message if failed

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_promotion_posts_project ON public.promotion_posts(project_id, created_at DESC);
CREATE INDEX idx_promotion_posts_status ON public.promotion_posts(status) WHERE status IN ('scheduled', 'publishing');
CREATE INDEX idx_promotion_posts_scheduled ON public.promotion_posts(scheduled_at)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;
CREATE INDEX idx_promotion_posts_platform ON public.promotion_posts(project_id, platform);

ALTER TABLE public.promotion_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_promotion_posts" ON public.promotion_posts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### 3.3.6 promotion_chat_history

AI 프로모션 생성 과정의 대화 기록. 포스트와 별도 관리.

```sql
CREATE TABLE public.promotion_chat_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  post_id        uuid REFERENCES public.promotion_posts(id) ON DELETE SET NULL,

  role           text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content        text NOT NULL,

  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_history_project ON public.promotion_chat_history(project_id, created_at);
CREATE INDEX idx_chat_history_post ON public.promotion_chat_history(post_id);

ALTER TABLE public.promotion_chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_chat" ON public.promotion_chat_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = promotion_chat_history.project_id
      AND projects.user_id = auth.uid()
    )
  );
```

#### 3.3.7 project_promotion_info

프로젝트별 프로모션 기본 정보 (AI 프롬프트에 주입되는 컨텍스트).

```sql
CREATE TABLE public.project_promotion_info (
  project_id       uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,

  service_name     text,
  description      text,
  target_user      text,                -- "주니어 개발자", "인디 해커" 등
  key_values       text,                -- "빠른 배포, 간편한 관리"
  site_url         text,
  default_hashtags text[] DEFAULT '{}',
  tone_preference  text DEFAULT 'friendly'
                   CHECK (tone_preference IN ('friendly', 'professional', 'humorous', 'informative')),
  logo_url         text,

  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_promotion_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_promo_info" ON public.project_promotion_info
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_promotion_info.project_id
      AND projects.user_id = auth.uid()
    )
  );
```

#### 3.3.8 sns_metrics_snapshots

SNS API에서 주기적으로 수집한 게시물별 지표 스냅샷.

```sql
CREATE TABLE public.sns_metrics_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid NOT NULL REFERENCES public.promotion_posts(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Common metrics
  impressions     int DEFAULT 0,
  likes           int DEFAULT 0,
  replies         int DEFAULT 0,
  reposts         int DEFAULT 0,          -- retweets (X) or reposts (Threads)
  quotes          int DEFAULT 0,
  bookmarks       int DEFAULT 0,          -- X only
  url_clicks      int DEFAULT 0,          -- X only (non_public_metrics)
  profile_clicks  int DEFAULT 0,          -- X only

  -- Threads-specific
  views           int DEFAULT 0,          -- Threads "views" metric

  -- Snapshot metadata
  snapshot_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sns_metrics_post ON public.sns_metrics_snapshots(post_id, snapshot_at DESC);
CREATE INDEX idx_sns_metrics_project ON public.sns_metrics_snapshots(project_id, snapshot_at DESC);

-- Partition by month for large datasets (optional, implement when > 100K rows)
-- CREATE TABLE sns_metrics_snapshots_2026_05 PARTITION OF sns_metrics_snapshots
--   FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

ALTER TABLE public.sns_metrics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_metrics" ON public.sns_metrics_snapshots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sns_metrics_snapshots.project_id
      AND projects.user_id = auth.uid()
    )
  );
```

#### 3.3.9 market_insights

시장 인사이트 (경쟁사 분석, 트렌드, 뉴스). LLM이 생성한 분석 결과를 저장.

```sql
CREATE TABLE public.market_insights (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Content
  insight_type    text NOT NULL
                  CHECK (insight_type IN ('competitor', 'trend', 'news', 'opportunity', 'threat')),
  title           text NOT NULL,
  summary         text NOT NULL,               -- LLM generated summary
  detail          text,                        -- full analysis
  source_urls     text[] DEFAULT '{}',         -- where data came from
  relevance_score float DEFAULT 0.5            -- 0.0 ~ 1.0, how relevant to this project
                  CHECK (relevance_score >= 0 AND relevance_score <= 1),

  -- Urgency
  is_urgent       boolean NOT NULL DEFAULT false,
  urgency_reason  text,                        -- why it's urgent

  -- Status
  is_read         boolean NOT NULL DEFAULT false,
  is_dismissed    boolean NOT NULL DEFAULT false,

  -- Metadata
  generated_by    text DEFAULT 'gemini',       -- which model generated this
  raw_data        jsonb DEFAULT '{}',          -- raw crawled data for debugging

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_market_insights_project ON public.market_insights(project_id, created_at DESC);
CREATE INDEX idx_market_insights_urgent ON public.market_insights(project_id, is_urgent)
  WHERE is_urgent = true AND is_dismissed = false;
CREATE INDEX idx_market_insights_unread ON public.market_insights(project_id, is_read)
  WHERE is_read = false;

ALTER TABLE public.market_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_insights" ON public.market_insights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = market_insights.project_id
      AND projects.user_id = auth.uid()
    )
  );
```

#### 3.3.10 deployment_logs

Vercel/Railway에서 수집한 배포 로그와 에러.

```sql
CREATE TABLE public.deployment_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Deployment info
  platform          text NOT NULL CHECK (platform IN ('vercel', 'railway')),
  deployment_id     text NOT NULL,              -- platform-specific ID
  deployment_url    text,
  commit_sha        text,
  commit_message    text,
  branch            text,

  -- Status
  status            text NOT NULL
                    CHECK (status IN ('building', 'deploying', 'ready', 'error', 'cancelled')),

  -- Error details
  error_message     text,
  error_logs        text,                       -- truncated build/runtime error

  -- Metrics snapshot at deploy time
  build_duration_ms int,

  -- Timestamps
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deployment_logs_project ON public.deployment_logs(project_id, created_at DESC);
CREATE INDEX idx_deployment_logs_status ON public.deployment_logs(project_id, status)
  WHERE status = 'error';

ALTER TABLE public.deployment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_deploys" ON public.deployment_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = deployment_logs.project_id
      AND projects.user_id = auth.uid()
    )
  );
```

#### 3.3.11 alerts

모든 종류의 알림을 통합 관리. 긴급/일반 구분.

```sql
CREATE TABLE public.alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Alert content
  alert_type      text NOT NULL
                  CHECK (alert_type IN (
                    'deploy_error', 'deploy_success',
                    'traffic_spike', 'traffic_drop',
                    'error_rate_high',
                    'sns_viral', 'sns_mention',
                    'market_urgent',
                    'scheduled_post_failed',
                    'token_expiring',
                    'system'
                  )),
  severity        text NOT NULL DEFAULT 'info'
                  CHECK (severity IN ('critical', 'warning', 'info', 'success')),
  title           text NOT NULL,
  message         text NOT NULL,
  action_url      text,                        -- deep link to relevant page

  -- Reference to source
  source_table    text,                        -- 'deployment_logs', 'market_insights', etc.
  source_id       uuid,                        -- ID in source table

  -- Status
  is_read         boolean NOT NULL DEFAULT false,
  read_at         timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_user ON public.alerts(user_id, created_at DESC);
CREATE INDEX idx_alerts_unread ON public.alerts(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_alerts_severity ON public.alerts(user_id, severity)
  WHERE severity = 'critical' AND is_read = false;

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_alerts" ON public.alerts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### 3.3.12 Shared Triggers

```sql
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all mutable tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.promotion_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.project_promotion_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.4 DB Optimization Notes

#### Query Performance

- **N+1 방지**: 프로젝트 목록 조회 시 이슈 카운트, 포스트 카운트를 JOIN 또는 subquery로 한 번에 가져옴. 절대 루프 안에서 쿼리 하지 않음
- **Pagination**: 모든 목록 API에 cursor-based pagination 적용 (`created_at` + `id` composite cursor). Offset pagination 금지 (대량 데이터에서 성능 저하)
- **Partial Index**: `WHERE status != 'resolved'`처럼 active 레코드만 인덱싱. 전체 인덱스 대비 크기 50%+ 절감
- **Connection pooling**: Supabase는 PgBouncer 내장. Transaction mode 사용. FastAPI에서 요청당 새 클라이언트 생성하지 않고 싱글턴 사용

#### Data Integrity

- **FK CASCADE**: 프로젝트 삭제 시 관련 데이터 전부 자동 삭제 (ON DELETE CASCADE)
- **CHECK constraints**: Enum 값은 application level이 아닌 DB level에서 검증
- **NOT NULL 적극 사용**: nullable은 진짜 optional인 경우에만

#### Migration Strategy

- `supabase/migrations/` 디렉토리에 타임스탬프 기반 순차 마이그레이션 파일
- 스키마 변경은 반드시 migration 파일로 (직접 SQL 콘솔에서 변경 금지)
- Breaking change (컬럼 삭제, 타입 변경)는 2단계: 1) 새 컬럼 추가 + 데이터 복사 2) 구 컬럼 삭제

---

## 4. Backend Architecture (FastAPI)

### 4.1 Directory Structure

```
backend/app/
  main.py                          # FastAPI app, middleware, lifespan
  api/
    routes/
      projects.py                  # /api/projects
      events.py                    # /api/projects/{id}/events
      issues.py                    # /api/projects/{id}/issues
      promotion.py                 # /api/projects/{id}/promotion
      insights.py                  # /api/projects/{id}/insights
      accounts.py                  # /api/accounts (connected accounts CRUD)
      alerts.py                    # /api/alerts
      deployments.py               # /api/projects/{id}/deployments
      webhooks.py                  # /api/webhooks (incoming webhooks from Vercel/Railway/GitHub)
      health.py                    # /api/health
    dependencies/
      auth.py                      # get_current_user dependency
      pagination.py                # cursor pagination dependency
      project_access.py            # verify user owns project
  core/
    config.py                      # Settings (env vars)
    supabase.py                    # Supabase client singleton
    redis.py                       # Redis client (cache + job queue)
    encryption.py                  # Token encryption/decryption (Fernet)
  models/
    project.py                     # Project schemas
    event.py                       # Event schemas
    issue.py                       # Issue schemas
    promotion.py                   # Promotion post + chat schemas
    account.py                     # Connected account schemas
    alert.py                       # Alert schemas
    insight.py                     # Market insight schemas
    deployment.py                  # Deployment log schemas
    common.py                      # Shared types (PaginatedResponse, etc.)
  services/
    project_service.py             # Project business logic
    promotion_service.py           # AI content generation + publishing
    insight_service.py             # Market insight generation
    metrics_service.py             # SNS metrics aggregation
    deployment_service.py          # Deployment monitoring logic
    alert_service.py               # Alert creation and dispatch
  integrations/
    x_api.py                       # X (Twitter) API v2 wrapper
    threads_api.py                 # Threads API v1.0 wrapper
    github_api.py                  # GitHub REST API wrapper
    vercel_api.py                  # Vercel REST API wrapper
    railway_api.py                 # Railway GraphQL API wrapper
    gemini.py                      # Google Gemini LLM wrapper
  workers/
    scheduler.py                   # APScheduler setup
    tasks/
      sync_sns_metrics.py          # Periodic SNS metrics polling
      refresh_tokens.py            # Token refresh before expiry
      publish_scheduled.py         # Publish scheduled promotion posts
      crawl_market.py              # Market intelligence crawling
      sync_deployments.py          # Poll deployment status
  tests/
    conftest.py
    test_projects.py
    test_promotion.py
    ...
```

### 4.2 Service Layer Pattern

현재 코드는 route에 비즈니스 로직이 직접 있음. 이걸 service layer로 분리한다.

```python
# routes/promotion.py -- thin route
@router.post("/{project_id}/promotion/generate")
async def generate_promotion(
    project_id: uuid.UUID,
    request: PromotionGenerateRequest,
    user: dict = Depends(get_current_user),
    project: dict = Depends(verify_project_access),
):
    result = await promotion_service.generate(
        project_id=project_id,
        user_id=user["id"],
        message=request.message,
        tone=request.tone,
        content_type=request.content_type,
        platform=request.platform,
    )
    return result

# services/promotion_service.py -- business logic
class PromotionService:
    async def generate(self, project_id, user_id, message, tone, content_type, platform):
        # 1. Load project promotion info
        # 2. Build prompt with context
        # 3. Call Gemini API
        # 4. Parse response
        # 5. Save to DB
        # 6. Return structured result
        ...
```

**이유**: Route는 HTTP 관심사(요청 파싱, 응답 포맷)만. 비즈니스 로직은 service에. 이렇게 해야 테스트 가능하고, worker에서도 같은 로직 재사용 가능.

### 4.3 Async Patterns

FastAPI는 async native. 모든 I/O를 비동기로.

```python
# BAD - blocking I/O in async context
def get_projects(user_id: str):
    result = supabase.table("projects").select("*").eq("user_id", user_id).execute()
    return result.data

# GOOD - async with httpx (Supabase Python SDK 2.x는 내부적으로 httpx 사용)
async def get_projects(user_id: str):
    result = await asyncio.to_thread(
        lambda: supabase.table("projects").select("*").eq("user_id", user_id).execute()
    )
    return result.data
```

**주의**: Supabase Python SDK (`supabase-py`)는 2026년 5월 기준 async를 완전히 지원하지 않을 수 있음. 이 경우 `asyncio.to_thread()`로 wrapping하거나, `httpx`로 직접 PostgREST API 호출.

#### Background Task Patterns

```python
# 1. FastAPI BackgroundTasks (짧은 작업, fire-and-forget)
@router.post("/{project_id}/promotion/publish")
async def publish_post(
    project_id: uuid.UUID,
    post_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    # 즉시 응답 반환
    background_tasks.add_task(
        promotion_service.publish_to_platform,
        post_id=post_id,
        user_id=user["id"],
    )
    return {"status": "publishing", "post_id": str(post_id)}

# 2. APScheduler (주기적 작업)
# workers/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

# 30분마다 SNS 지표 수집
scheduler.add_job(sync_sns_metrics, "interval", minutes=30)

# 1시간마다 토큰 만료 체크 및 갱신
scheduler.add_job(refresh_expiring_tokens, "interval", hours=1)

# 5분마다 예약 게시물 발행 체크
scheduler.add_job(publish_scheduled_posts, "interval", minutes=5)

# 6시간마다 시장 인사이트 크롤링
scheduler.add_job(crawl_market_insights, "interval", hours=6)

# 10분마다 배포 상태 동기화
scheduler.add_job(sync_deployment_status, "interval", minutes=10)
```

### 4.4 Error Handling Strategy

```python
# core/exceptions.py
class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400, error_code: str = "BAD_REQUEST"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code

class NotFoundError(AppError):
    def __init__(self, resource: str, id: str):
        super().__init__(f"{resource} not found: {id}", 404, "NOT_FOUND")

class ExternalAPIError(AppError):
    def __init__(self, service: str, detail: str):
        super().__init__(f"{service} API error: {detail}", 502, "EXTERNAL_API_ERROR")

# main.py - global handler
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.error_code, "message": exc.message},
    )
```

### 4.5 API Endpoints (Complete List)

#### Projects

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects` | List user's projects (with issue/post counts) |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/{id}` | Get project detail |
| PATCH | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project + cascade |

#### Events

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects/{id}/events` | List events (filter: month, type) |
| POST | `/api/projects/{id}/events` | Create event |
| PATCH | `/api/projects/{id}/events/{eid}` | Update event |
| DELETE | `/api/projects/{id}/events/{eid}` | Delete event |

#### Issues

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects/{id}/issues` | List issues (filter: status, severity, source) |
| POST | `/api/projects/{id}/issues` | Create issue |
| PATCH | `/api/projects/{id}/issues/{iid}` | Update issue |
| DELETE | `/api/projects/{id}/issues/{iid}` | Delete issue |

#### Promotion

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects/{id}/promotion/posts` | List promotion posts (filter: platform, status) |
| POST | `/api/projects/{id}/promotion/posts` | Create promotion post (draft) |
| GET | `/api/projects/{id}/promotion/posts/{pid}` | Get post detail |
| PATCH | `/api/projects/{id}/promotion/posts/{pid}` | Update post |
| DELETE | `/api/projects/{id}/promotion/posts/{pid}` | Delete post |
| POST | `/api/projects/{id}/promotion/generate` | AI generate content |
| POST | `/api/projects/{id}/promotion/posts/{pid}/publish` | Publish to SNS platform |
| GET | `/api/projects/{id}/promotion/info` | Get project promotion info |
| PUT | `/api/projects/{id}/promotion/info` | Upsert project promotion info |
| GET | `/api/projects/{id}/promotion/chat` | Get chat history |

#### Insights

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects/{id}/insights/marketing` | Marketing metrics (aggregated SNS data) |
| GET | `/api/projects/{id}/insights/operations` | Operations overview (issues + deploys) |
| GET | `/api/projects/{id}/insights/market` | Market insights list |
| POST | `/api/projects/{id}/insights/market/generate` | Trigger market insight generation |
| PATCH | `/api/projects/{id}/insights/market/{mid}` | Mark as read/dismissed |

#### Deployments

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects/{id}/deployments` | List deployment logs |
| POST | `/api/projects/{id}/deployments/sync` | Manual sync from platform |

#### Connected Accounts

| Method | Path | Description |
|---|---|---|
| GET | `/api/accounts` | List user's connected accounts |
| GET | `/api/accounts/connect/{provider}` | Get OAuth URL for provider |
| GET | `/api/accounts/callback/{provider}` | OAuth callback handler |
| DELETE | `/api/accounts/{id}` | Disconnect account |

#### Alerts

| Method | Path | Description |
|---|---|---|
| GET | `/api/alerts` | List alerts (filter: severity, is_read) |
| PATCH | `/api/alerts/{id}/read` | Mark as read |
| POST | `/api/alerts/read-all` | Mark all as read |

#### Webhooks (Incoming)

| Method | Path | Description |
|---|---|---|
| POST | `/api/webhooks/vercel` | Vercel deployment events |
| POST | `/api/webhooks/railway` | Railway deployment events |
| POST | `/api/webhooks/github` | GitHub push/PR/issue events |

#### Health

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |

### 4.6 Common Pitfalls to Avoid (AI Vibe Coding Anti-patterns)

이 섹션은 바이브 코딩에서 AI가 자주 놓치는 것들을 명시적으로 기록한다.

1. **Race condition on publish**: 사용자가 "게시" 버튼을 빠르게 두 번 누르면 X에 같은 글이 두 번 올라감. 해결: `status`를 `publishing`으로 먼저 변경하고, DB에서 `UPDATE ... WHERE status = 'scheduled'`의 affected rows가 0이면 이미 처리 중으로 판단

2. **Token refresh 경쟁**: 여러 요청이 동시에 만료된 토큰으로 접근 -> 전부 refresh 시도 -> refresh token이 single-use면 첫 번째만 성공, 나머지 실패. 해결: Redis lock으로 provider+user 조합에 대해 refresh 직렬화

3. **Webhook 중복 delivery**: Vercel/GitHub은 webhook 재전송할 수 있음. 해결: `deployment_id`로 idempotency check (DB에 이미 있으면 skip)

4. **Large response 미처리**: SNS metrics 수천 건을 한 번에 반환하면 프론트가 멈춤. 해결: pagination + 프론트에서 date range 필터 필수

5. **Supabase service_role_key 남용**: 현재 백엔드가 service_role_key로 모든 작업을 수행하는데, 이러면 RLS가 무력화됨. 해결: 읽기/쓰기 작업은 anon key + user JWT를 함께 전달하거나, service_role은 시스템 작업(webhook 처리, background job)에만 사용

6. **날짜/시간 timezone 불일치**: 프론트(KST) -> 백엔드(UTC?) -> DB(UTC). 해결: 모든 곳에서 UTC 저장, 프론트에서만 KST 변환. `timestamptz` 타입 사용으로 PostgreSQL이 알아서 처리

7. **Gemini API 응답 파싱 실패**: LLM 응답이 기대한 JSON 형식이 아닐 수 있음. 해결: structured output (Gemini의 `response_mime_type: "application/json"` + `response_schema`) 사용. 그래도 실패하면 graceful fallback

8. **환경변수 누락으로 서버 무한 재시작**: 필수 환경변수 하나 빠지면 Pydantic Settings에서 validation error -> 서버 crash -> Railway 재시작 -> 무한 루프. 해결: startup event에서 명시적으로 체크하고 human-readable 에러 메시지 출력 후 graceful shutdown

---

## 5. Frontend Architecture (Next.js)

### 5.1 Page Structure (Target)

```
src/app/
  layout.tsx                           # Root: providers (theme, auth, toast)
  page.tsx                             # / -> redirect based on auth
  login/page.tsx                       # Google OAuth login

  projects/
    page.tsx                           # Project list (real API)
    new/page.tsx                       # Onboarding wizard (4 steps + SNS connect)

  projects/[id]/
    layout.tsx                         # Sidebar + project context provider
    page.tsx                           # Dashboard overview
    calendar/page.tsx                  # Event calendar
    promotion/
      page.tsx                         # Promotion calendar view
      post/[postId]/page.tsx           # Post editor (new + edit)
    issues/page.tsx                    # Issue tracker
    insights/
      page.tsx                         # Tabs: marketing / market / operations
    settings/page.tsx                  # Project settings + connected services

  settings/
    page.tsx                           # User settings
    accounts/page.tsx                  # Connected accounts management
```

### 5.2 State Management

| Type | Solution | Use Case |
|---|---|---|
| Server State | SWR or React Query (TanStack Query) | API data fetching, caching, revalidation |
| URL State | Next.js params + searchParams | Filters, pagination, tab selection |
| Form State | React Hook Form + Zod | All forms (project create, post editor) |
| UI State | useState / useReducer | Modals, drawers, local toggles |
| Global | React Context (minimal) | Auth user, current project, toast queue |

**SWR 선택 이유**: Vercel 제품이라 Next.js와 궁합이 좋고, 가벼움. React Query도 가능하지만 이 프로젝트 규모에선 SWR로 충분.

```typescript
// hooks/useProject.ts
export function useProject(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/projects/${projectId}`,
    () => getProject(projectId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // 10초 내 중복 요청 방지
    }
  );
  return { project: data, error, isLoading, mutate };
}

// hooks/useAlerts.ts
export function useAlerts() {
  const { data, mutate } = useSWR(
    "/api/alerts?is_read=false",
    () => listAlerts({ is_read: false }),
    {
      refreshInterval: 30000, // 30초마다 새 알림 체크
    }
  );
  return { alerts: data, mutate };
}
```

### 5.3 Component Architecture

```
src/components/
  layout/
    app-sidebar.tsx                 # Main app sidebar (project nav)
    header.tsx                      # Top bar (alerts, user menu, theme toggle)
    alert-bell.tsx                  # Notification bell with badge count
  
  dashboard/
    metric-card.tsx                 # Stats card with sparkline
    chart-area.tsx                  # Area chart wrapper
    deployment-table.tsx            # Deployment log table
    service-status.tsx              # Service health indicator

  promotion/
    post-card.tsx                   # Post preview card
    post-editor.tsx                 # Split editor (input + preview)
    platform-preview.tsx            # Platform-specific post preview
    ai-generate-panel.tsx           # AI generation controls

  calendar/
    month-grid.tsx                  # Calendar month view
    event-item.tsx                  # Single event in list
    event-form.tsx                  # Add/edit event modal

  issues/
    issue-list.tsx                  # Issue list with filters
    issue-card.tsx                  # Single issue card
    severity-badge.tsx              # Critical/Warning/Info badge

  insights/
    marketing-tab.tsx               # Marketing insights content
    market-tab.tsx                  # Market intelligence content
    operations-tab.tsx              # Operations content
    insight-card.tsx                # Single insight card (with urgency indicator)

  onboarding/
    stepper.tsx                     # Progress indicator
    prd-step.tsx                    # Step 1: PRD
    github-step.tsx                 # Step 2: GitHub
    sns-step.tsx                    # Step 3: SNS connect (OAuth flow)
    deploy-step.tsx                 # Step 4: Deploy platform connect
    complete-step.tsx               # Step 5: Done

  shared/
    empty-state.tsx                 # Empty state with illustration
    loading-skeleton.tsx            # Skeleton loader variants
    error-boundary.tsx              # Error boundary with retry
    confirm-dialog.tsx              # Confirmation modal
    toast.tsx                       # Toast notification system
    badge.tsx                       # Status/severity badges
    data-table.tsx                  # Sortable, filterable table
    pagination.tsx                  # Cursor pagination controls

  ui/                               # shadcn/ui primitives
    button.tsx
    input.tsx
    dialog.tsx
    dropdown-menu.tsx
    tabs.tsx
    card.tsx
    ...
```

### 5.4 Data Fetching Pattern

Mock data를 전부 제거하고, 실제 API 호출로 전환.

```typescript
// BEFORE (mock data)
export default function ProjectsPage() {
  const MOCK_PROJECTS = [
    { id: "1", name: "TaskFlow", ... },
  ];
  return <Grid>{MOCK_PROJECTS.map(p => <Card key={p.id} />)}</Grid>;
}

// AFTER (real API + loading/error states)
"use client";

import useSWR from "swr";
import { listProjects } from "@/lib/api/projects";

export default function ProjectsPage() {
  const { data: projects, error, isLoading } = useSWR("projects", listProjects);

  if (isLoading) return <ProjectsSkeleton />;
  if (error) return <ErrorState message="Failed to load projects" retry={() => mutate()} />;
  if (!projects?.length) return <EmptyState action={{ label: "Create Project", href: "/projects/new" }} />;

  return <Grid>{projects.map(p => <ProjectCard key={p.id} project={p} />)}</Grid>;
}
```

### 5.5 Form Validation (Zod)

```typescript
// lib/validations/project.ts
import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  description: z.string().max(500).optional(),
  prd: z.string().max(10000).optional(),
  github_repo_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  sns_channels: z.array(z.enum(["x", "threads", "bluesky", "mastodon"])),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
```

---

## 6. Authentication and Authorization

### 6.1 Auth Flow (Current - Supabase Google OAuth)

```
User -> Login Page -> Supabase signInWithOAuth(google) -> Google Consent
     -> Supabase callback -> /auth/callback (Next.js route)
     -> exchangeCodeForSession -> Set cookies -> Redirect /projects
```

이 플로우는 유지. 변경 없음.

### 6.2 External Service OAuth Flows

각 외부 서비스(X, Threads, GitHub, Vercel, Railway)는 별도 OAuth 플로우.

```
User -> Dashboard Settings -> "Connect X" button
     -> Frontend redirects to: /api/accounts/connect/x
     -> Backend generates OAuth URL with state + PKCE
     -> Redirect to X authorization page
     -> User grants access
     -> X redirects to: /api/accounts/callback/x?code=...&state=...
     -> Backend exchanges code for tokens
     -> Encrypt and store tokens in connected_accounts
     -> Redirect back to frontend settings page
```

#### X (Twitter) OAuth 2.0 + PKCE

```python
# integrations/x_api.py

class XAPIClient:
    AUTH_URL = "https://twitter.com/i/oauth2/authorize"
    TOKEN_URL = "https://api.x.com/2/oauth2/token"
    SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"]

    def get_auth_url(self, state: str, code_challenge: str) -> str:
        params = {
            "response_type": "code",
            "client_id": settings.x_client_id,
            "redirect_uri": f"{settings.backend_url}/api/accounts/callback/x",
            "scope": " ".join(self.SCOPES),
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"

    async def exchange_code(self, code: str, code_verifier: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(self.TOKEN_URL, data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": f"{settings.backend_url}/api/accounts/callback/x",
                "code_verifier": code_verifier,
                "client_id": settings.x_client_id,
            }, auth=(settings.x_client_id, settings.x_client_secret))
            return response.json()
```

#### Threads OAuth 2.0

```python
# integrations/threads_api.py

class ThreadsAPIClient:
    AUTH_URL = "https://threads.net/oauth/authorize"
    TOKEN_URL = "https://graph.threads.net/oauth/access_token"
    LONG_LIVED_TOKEN_URL = "https://graph.threads.net/access_token"
    SCOPES = ["threads_basic", "threads_content_publish", "threads_manage_insights"]

    # Short-lived token (1 hour) -> exchange for long-lived (60 days)
    async def exchange_for_long_lived(self, short_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(self.LONG_LIVED_TOKEN_URL, params={
                "grant_type": "th_exchange_token",
                "client_secret": settings.threads_client_secret,
                "access_token": short_token,
            })
            return response.json()
```

### 6.3 Token Security

- 모든 access_token, refresh_token은 **Fernet 대칭 암호화** 후 DB 저장
- 암호화 키는 `ENCRYPTION_KEY` 환경변수 (32-byte base64)
- 복호화는 사용 시점에만 (메모리에 평문 토큰이 최소 시간만 존재)

```python
# core/encryption.py
from cryptography.fernet import Fernet

_fernet = Fernet(settings.encryption_key.encode())

def encrypt_token(token: str) -> str:
    return _fernet.encrypt(token.encode()).decode()

def decrypt_token(encrypted: str) -> str:
    return _fernet.decrypt(encrypted.encode()).decode()
```

---

## 7. External API Integrations

### 7.1 X (Twitter) API v2

| Feature | Endpoint | Method |
|---|---|---|
| Post tweet | `/2/tweets` | POST |
| Get user's tweets | `/2/users/{id}/tweets?tweet.fields=public_metrics,non_public_metrics` | GET |
| Get single tweet metrics | `/2/tweets/{id}?tweet.fields=public_metrics,non_public_metrics` | GET |
| Lookup user by username | `/2/users/by/username/{username}` | GET |

**Rate Limits**: 100 tweets/15min per user, 900 reads/15min per user
**Cost**: Pay-per-use: $0.01/post, $0.001/own-read, $0.005/other-read
**Token Refresh**: Access token expires in 2 hours. Refresh token persistent.

**Caching Strategy**: 게시물 metrics는 30분 캐시. 트윗 발행은 캐시 없음.

### 7.2 Threads API v1.0

| Feature | Endpoint | Method |
|---|---|---|
| Create post (step 1) | `/{user_id}/threads` | POST |
| Publish post (step 2) | `/{user_id}/threads_publish` | POST |
| Get user's posts | `/{user_id}/threads` | GET |
| Get post insights | `/{media_id}/insights?metric=views,likes,replies,reposts,quotes` | GET |

**Rate Limits**: `4800 * impressions` formula per 24h. 250 posts/24h per user.
**Cost**: Free
**Token Refresh**: Long-lived token expires in 60 days. Refresh before expiry.
**Publishing**: 2-step process (create container -> publish). Images/video need processing wait.

### 7.3 GitHub REST API

| Feature | Endpoint | Method |
|---|---|---|
| Get repo info | `/repos/{owner}/{repo}` | GET |
| List commits | `/repos/{owner}/{repo}/commits` | GET |
| List issues | `/repos/{owner}/{repo}/issues` | GET |
| List PRs | `/repos/{owner}/{repo}/pulls` | GET |
| Create webhook | `/repos/{owner}/{repo}/hooks` | POST |

**Rate Limits**: 5,000 requests/hour per authenticated user
**Webhook Events**: `push`, `pull_request`, `issues`, `deployment_status`

### 7.4 Vercel REST API

| Feature | Endpoint | Method |
|---|---|---|
| List deployments | `/v6/deployments` | GET |
| Get deployment detail | `/v13/deployments/{idOrUrl}` | GET |
| Get build logs | `/v3/deployments/{idOrUrl}/events` | GET |

**Runtime Logs**: Not available via REST. Must configure Log Drains.
**Webhook Events**: `deployment.created`, `deployment.succeeded`, `deployment.error`

### 7.5 Railway GraphQL API

| Feature | Query/Mutation |
|---|---|
| List deployments | `query { deployments(input: { serviceId: "..." }) { ... } }` |
| Get deployment status | `query { deployment(id: "...") { status } }` |
| Get service metrics | Via GraphQL introspection |

**Webhooks**: Configured per project. Events: deployment succeeded/failed/crashed.
**Authentication**: Bearer token or Project-Access-Token (different headers).

### 7.6 Integration Architecture

```python
# integrations/base.py
class BaseAPIClient:
    """Base class for all external API integrations."""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=30.0,
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            )
        return self._client

    async def _request(self, method: str, path: str, token: str, **kwargs) -> dict:
        client = await self._get_client()
        headers = {"Authorization": f"Bearer {token}"}
        try:
            response = await client.request(method, path, headers=headers, **kwargs)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                # Rate limited - extract retry-after and raise
                retry_after = e.response.headers.get("retry-after", "60")
                raise RateLimitError(service=self.__class__.__name__, retry_after=int(retry_after))
            raise ExternalAPIError(service=self.__class__.__name__, detail=str(e))

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
```

---

## 8. AI/LLM Features

### 8.1 Promotion Content Generation

현재 프롬프트가 단순함. 프로덕트 컨텍스트 + 플랫폼 특성 + 톤 + 과거 성과를 반영한 프롬프트로 개선.

```python
# services/promotion_service.py

SYSTEM_PROMPT = """You are a marketing copywriter for indie products.
You write promotional content for social media platforms.

Rules:
- Write in the language the user requests (default: Korean)
- Never use emojis
- Adapt to the target platform's style and character limits
- Be authentic, not salesy. Indie hackers value honesty over hype
- Include specific details about the product, not generic marketing speak
- Hook must grab attention in the first line (it's what shows in feeds)

Platform guidelines:
- X (Twitter): Max 280 characters. Short, punchy. Thread format for longer content.
- Threads: Max 500 characters. More conversational, community-oriented.
- Bluesky: Max 300 characters. Tech-savvy audience, authentic tone.
"""

async def generate(self, project_id, user_id, message, tone, content_type, platform):
    # 1. Load project context
    promo_info = await self._get_promotion_info(project_id)
    project = await self._get_project(project_id)

    # 2. Load past top-performing posts for this project (if any)
    top_posts = await self._get_top_posts(project_id, platform, limit=3)

    # 3. Build user prompt with rich context
    user_prompt = f"""
Product: {promo_info.service_name}
Description: {promo_info.description}
Target User: {promo_info.target_user}
Key Values: {promo_info.key_values}
Platform: {platform}
Tone: {tone}
Content Type: {content_type}

User's request: {message}

{"Past high-performing posts for reference:" if top_posts else ""}
{self._format_top_posts(top_posts)}

Generate:
1. hook: Opening line that grabs attention (1 sentence)
2. content: Main body of the post
3. hashtags: 3-5 relevant hashtags (without #)
"""

    # 4. Call Gemini with structured output
    response = await self._call_gemini(
        system=SYSTEM_PROMPT,
        user=user_prompt,
        response_schema={
            "type": "object",
            "properties": {
                "hook": {"type": "string"},
                "content": {"type": "string"},
                "hashtags": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["hook", "content", "hashtags"],
        },
    )
    return response
```

### 8.2 Market Insight Generation

경쟁사 분석과 시장 동향을 자동 수집하고 LLM으로 분석. RAG까지 갈 필요 없이, 웹 검색 + LLM 요약으로 시작.

```python
# workers/tasks/crawl_market.py

async def crawl_market_insights():
    """6시간마다 실행. 각 프로젝트별 시장 인사이트 생성."""

    projects = await get_active_projects()

    for project in projects:
        if not project.get("description"):
            continue

        # 1. Gemini의 Google Search grounding 활용
        #    (Gemini 2.5는 search grounding이 내장되어 있어 별도 크롤러 불필요)
        prompt = f"""
Analyze the current market landscape for this product:
Product: {project["name"]}
Description: {project["description"]}
Category: {project.get("prd", "indie software product")}

Tasks:
1. Identify 2-3 competitors and their recent moves
2. Find relevant industry trends or news from the past week
3. Spot any opportunities or threats
4. Rate urgency (is there something the founder should act on NOW?)

For each finding, provide:
- type: competitor | trend | news | opportunity | threat
- title: short headline
- summary: 2-3 sentences
- relevance_score: 0.0-1.0 (how relevant to this specific product)
- is_urgent: boolean
- urgency_reason: why urgent (if applicable)
- source_urls: where you found this (if applicable)

Return as JSON array.
"""

        insights = await gemini_client.generate(
            prompt=prompt,
            model="gemini-2.5-pro",  # Pro for deeper analysis
            tools=["google_search"],  # Enable search grounding
            response_mime_type="application/json",
        )

        # 2. Save insights to DB
        for insight in insights:
            await save_market_insight(project["id"], insight)

            # 3. If urgent, create alert
            if insight.get("is_urgent"):
                await alert_service.create(
                    user_id=project["user_id"],
                    project_id=project["id"],
                    alert_type="market_urgent",
                    severity="warning",
                    title=insight["title"],
                    message=insight["summary"],
                    source_table="market_insights",
                )
```

### 8.3 RAG 필요 여부

현 단계에서 RAG는 **불필요**. 이유:

- Gemini 2.5는 search grounding (실시간 웹 검색)을 내장하고 있어 별도 벡터 DB 없이도 최신 정보 접근 가능
- 프로젝트별 컨텍스트 (PRD, promotion info)는 수 KB 수준이라 프롬프트에 직접 주입 가능
- RAG가 필요한 시점: 사용자가 자체 문서 (수십 페이지 PRD, 회의록 등)를 업로드하고 이를 기반으로 인사이트를 생성할 때

향후 RAG 확장이 필요하면:
- Supabase의 `pgvector` 확장 사용 (별도 벡터 DB 불필요)
- `embedding` 컬럼 추가 (`vector(768)` for Gemini embedding)
- 문서 청킹 -> 임베딩 -> 유사도 검색 -> LLM 컨텍스트 주입

---

## 9. Real-time and Notification System

### 9.1 Architecture

```
[Webhook / Background Worker]
    |
    v
[alert_service.create()]  -->  [INSERT into alerts table]
                                      |
                                      v
                               [Supabase Realtime]
                                      |
                                      | WebSocket (postgres_changes)
                                      v
                               [Frontend useAlerts hook]
                                      |
                                      v
                               [Toast notification + Bell badge update]
```

### 9.2 Supabase Realtime Subscription

```typescript
// hooks/useRealtimeAlerts.ts
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

export function useRealtimeAlerts(userId: string, onNewAlert: (alert: Alert) => void) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNewAlert(payload.new as Alert);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onNewAlert]);
}
```

### 9.3 Alert Severity and Display

| Severity | Visual | Behavior |
|---|---|---|
| `critical` | Red badge, pulse animation | Toast with sound, persistent until dismissed |
| `warning` | Amber badge | Toast, auto-dismiss 10s |
| `info` | Blue badge | Bell badge only, no toast |
| `success` | Green badge | Toast, auto-dismiss 5s |

### 9.4 Alert Triggers

| Event | Alert Type | Severity |
|---|---|---|
| Deployment failed | `deploy_error` | critical |
| Deployment succeeded | `deploy_success` | success |
| Error rate > 5% | `error_rate_high` | critical |
| Traffic spike (>200% baseline) | `traffic_spike` | warning |
| Traffic drop (>50% baseline) | `traffic_drop` | warning |
| Scheduled post failed to publish | `scheduled_post_failed` | warning |
| Post going viral (>10x avg engagement) | `sns_viral` | info |
| Market insight marked urgent | `market_urgent` | warning |
| OAuth token expiring in <24h | `token_expiring` | warning |

---

## 10. Design System

### 10.1 Design Philosophy

기존 DESIGN.md는 전면 재작성한다. 다음 레퍼런스를 기반으로:

- **Linear DESIGN.md** -- 다크모드 surface ladder, 단일 accent color 규율
- **Vercel DESIGN.md** -- 컴포넌트 패턴 (app shell, data table, toast, empty state)
- **Supabase DESIGN.md** -- 프로덕트 중심 디자인, grey ladder

### 10.2 Brand Identity: Acid Yellow x Dark Gray

**Acid Yellow (#EFFF00)** + **Dark Gray (#1C1C1C)** 조합.

- 인디 해커/빌더의 에너지와 실행력을 상징
- SaaS 대시보드에서 거의 사용되지 않는 조합 -- 즉시 식별 가능한 브랜드 차별화
- AI가 생성하는 전형적인 blue/purple/gradient 패턴과 완전히 대비
- Dark-first 설계: 다크 모드가 기본(primary), 라이트 모드가 보조(secondary)

### 10.3 Core Principles

1. **Dark-first** -- Dark Gray 캔버스가 기본. Acid Yellow가 어두운 배경 위에서 가장 강렬하게 빛남
2. **Yellow is scarce** -- Acid Yellow는 전체 화면의 5% 이하에만 사용. CTA, active indicator, 긴급 badge, 차트 핵심 라인에만. 남발하면 효과 사라짐
3. **Surface hierarchy, not shadow** -- depth는 surface color 단계(#1C1C1C -> #252525 -> #2E2E2E)로 표현. drop shadow 최소화
4. **Product is the decoration** -- 장식 대신 실제 데이터와 차트가 시각적 주인공
5. **Dense but breathable** -- 대시보드는 정보 밀도가 높아야 함. 그러나 충분한 여백으로 숨 쉴 공간
6. **No AI aesthetic** -- 반투명 글래스모피즘, 그라디언트, 둥근 모서리 과용 금지

### 10.4 Color System

모든 색상은 semantic token으로만 참조. hardcoded hex 금지.

#### Dark Mode (Primary -- 기본 모드)

```css
:root {
  /* === Canvas & Surfaces === */
  --canvas:            #1C1C1C;              /* 기본 배경. Dark Gray */
  --surface-1:         #252525;              /* 카드, 패널 배경 */
  --surface-2:         #2E2E2E;              /* 중첩된 surface (카드 안 카드) */
  --surface-3:         #383838;              /* input 배경, hover 상태 */

  /* === Borders === */
  --border:            #333333;              /* 기본 hairline border */
  --border-strong:     #484848;              /* 강조 border (active section) */

  /* === Text === */
  --text-primary:      #F0F0F0;              /* 제목, 핵심 텍스트 */
  --text-secondary:    #A0A0A0;              /* 본문 텍스트 */
  --text-tertiary:     #6B6B6B;              /* 캡션, 타임스탬프 */
  --text-disabled:     #4A4A4A;              /* 비활성 텍스트 */

  /* === Accent: Acid Yellow === */
  --accent:            #EFFF00;              /* Acid Yellow. CTA, active, highlight */
  --accent-hover:      #D4E300;              /* hover: 약간 어둡게 */
  --accent-muted:      rgba(239, 255, 0, 0.15);  /* 배경 tint (badge bg, subtle highlight) */
  --accent-foreground: #1C1C1C;              /* Yellow 위의 텍스트 = Dark Gray */

  /* === Semantic === */
  --success:           #34D399;              /* emerald-400 */
  --success-muted:     rgba(52, 211, 153, 0.15);
  --warning:           #FBBF24;              /* amber-400 */
  --warning-muted:     rgba(251, 191, 36, 0.15);
  --error:             #F87171;              /* red-400 */
  --error-muted:       rgba(248, 113, 113, 0.15);
  --info:              #60A5FA;              /* blue-400 */
  --info-muted:        rgba(96, 165, 250, 0.15);
}
```

#### Light Mode (Secondary)

```css
.light {
  /* === Canvas & Surfaces === */
  --canvas:            #FAFAFA;              /* near-white (not pure white, 덜 눈부심) */
  --surface-1:         #FFFFFF;              /* 카드 배경 = pure white */
  --surface-2:         #F5F5F5;              /* 중첩 surface */
  --surface-3:         #EEEEEE;              /* input 배경 */

  /* === Borders === */
  --border:            #E5E5E5;              /* 기본 border */
  --border-strong:     #D4D4D4;              /* 강조 border */

  /* === Text === */
  --text-primary:      #1C1C1C;              /* Dark Gray. 제목 */
  --text-secondary:    #525252;              /* 본문 */
  --text-tertiary:     #8B8B8B;              /* 캡션 */
  --text-disabled:     #B5B5B5;              /* 비활성 */

  /* === Accent: Acid Yellow === */
  /*
   * IMPORTANT: Light mode에서 Yellow의 사용 규칙이 다름.
   * Yellow 텍스트 = 절대 금지 (white 배경에서 contrast 부족, WCAG fail)
   * Yellow는 오직 배경색으로만 사용 (버튼 bg, badge bg)
   * 그 위 텍스트는 항상 --accent-foreground (#1C1C1C)
   */
  --accent:            #EFFF00;
  --accent-hover:      #D4E300;
  --accent-muted:      rgba(239, 255, 0, 0.12);
  --accent-foreground: #1C1C1C;

  /* === Semantic === */
  --success:           #059669;              /* emerald-600 (darker for light bg) */
  --success-muted:     rgba(5, 150, 105, 0.10);
  --warning:           #D97706;              /* amber-600 */
  --warning-muted:     rgba(217, 119, 6, 0.10);
  --error:             #DC2626;              /* red-600 */
  --error-muted:       rgba(220, 38, 38, 0.10);
  --info:              #2563EB;              /* blue-600 */
  --info-muted:        rgba(37, 99, 235, 0.10);
}
```

#### Accent Usage Rules (반드시 준수)

| Context | Dark Mode | Light Mode |
|---|---|---|
| Primary CTA button | bg: `--accent`, text: `--accent-foreground` | 동일 |
| Active tab indicator | 2px bottom-border `--accent` | 동일 |
| Active sidebar item | left-border `--accent` + bg `--accent-muted` | 동일 |
| Badge (urgent/new) | bg: `--accent`, text: `--accent-foreground` | 동일 |
| Chart highlight line | stroke: `--accent` | 동일 |
| Link text | color: `--accent` (dark bg에서 OK) | color: `--text-primary` + underline (yellow text 금지) |
| Focus ring | 2px ring `--accent` at 40% opacity | 동일 |
| Input focus border | border-color: `--accent` | 동일 |
| Large area background | 금지. Yellow 배경 넓게 쓰지 않음 | 금지 |
| Body text color | 금지 | 금지 |
| Icon tint (대량) | 금지. 아이콘은 text-secondary | 금지 |

#### Contrast Verification

```
Dark mode:
  #F0F0F0 (text-primary) on #1C1C1C (canvas)     = 13.2:1  (AAA)
  #A0A0A0 (text-secondary) on #1C1C1C (canvas)   = 5.3:1   (AA)
  #EFFF00 (accent) on #1C1C1C (canvas)            = 12.8:1  (AAA)
  #1C1C1C (accent-fg) on #EFFF00 (accent bg)      = 12.8:1  (AAA)

Light mode:
  #1C1C1C (text-primary) on #FAFAFA (canvas)      = 14.7:1  (AAA)
  #525252 (text-secondary) on #FAFAFA (canvas)    = 6.5:1   (AA)
  #1C1C1C (accent-fg) on #EFFF00 (accent bg)      = 12.8:1  (AAA)
  #EFFF00 on #FAFAFA (이것이 금지 이유)              = 1.2:1   (FAIL)
```

### 10.5 Typography

Geist Sans (open-source, Vercel) + Geist Mono for code/metrics.
Dark canvas 위에서 Geist의 가는 weight가 날카롭게 보여서 이 조합에 잘 맞음.

**크기 대비를 극대화한다.** 대시보드에서 가장 중요한 숫자(Metric)는 가장 크고, 
라벨(Caption)은 가장 작다. 이 차이가 시각적 계층 구조를 만든다.

```
Metric:   36px / 700 / -0.03em  -- 대시보드 핵심 숫자. 가장 큼. (tabular-nums)
Display:  28px / 700 / -0.02em  -- 페이지 타이틀
Title:    20px / 600 / -0.01em  -- 섹션 헤더
Heading:  15px / 600 / 0        -- 카드 타이틀
Body:     14px / 400 / 0        -- 본문 텍스트
Small:    13px / 400 / 0        -- 테이블 셀, 부가 정보
Caption:  11px / 500 / 0.04em   -- 라벨, 타임스탬프. uppercase. 가장 작음.
```

**대비 예시 (Transcope 스타일)**:
- "7.4 L" (Metric 36px, white, bold) 바로 아래 "Baseline" (Caption 11px, text-tertiary, uppercase)
- "42" (Metric 36px) 옆에 "Truck" (Body 14px, text-secondary)
- 라벨과 숫자의 크기 비율 최소 2.5:1 이상 유지

Metric 숫자에는 `font-variant-numeric: tabular-nums`로 숫자 폭 고정 (카운터 애니메이션 시 layout shift 방지).

### 10.6 Layout Principles: Zero Dividers, Tight Gaps

Transcope 스타일의 핵심: **구분선 없이, surface color 차이와 border-radius만으로 영역을 구분.**

#### Zero Divider Policy

```
금지: border-bottom, <hr>, divider 컴포넌트, separator line
허용: surface color 차이 (canvas vs surface-1 vs surface-2)
허용: border-radius로 카드 경계를 시각적으로 인지
예외: 테이블 내 행 구분 (1px var(--surface-3), border가 아닌 surface색)
```

- Nav bar와 content 영역 사이: 구분선 없음. nav는 canvas 색, content도 canvas 색. 카드(surface-1)가 content 영역에서 떠 보이면서 자연스럽게 구분
- Sidebar와 main content 사이: 구분선 없음. sidebar는 surface-1, main은 canvas
- 섹션과 섹션 사이: 구분선 대신 spacing (16-24px gap)으로 분리

#### Tight Card Gap

카드 간 간격은 좁게. 빈 공간이 아니라 카드 자체가 화면을 채우는 느낌.

```
카드 간 gap:         6px   -- 카드와 카드 사이. 빽빽하게.
카드 내부 padding:   16px 20px  -- 안은 여유있게 (top/bottom 16, left/right 20)
페이지 외곽 padding: 16px  -- 화면 가장자리에서 카드까지의 거리
섹션 간 gap:         16px  -- 큰 섹션 (e.g. 차트 영역과 테이블 영역) 사이
```

**핵심**: gap이 좁을수록 카드들이 하나의 덩어리(cluster)로 인지됨. 
이게 정보 밀도를 높이면서도 정돈된 느낌을 줌.

### 10.7 Border Radius: Soft, Rounded Feel

전체적으로 둥근 느낌. Transcope처럼 넉넉한 radius.

```
Card / Panel:      16px  (rounded-2xl) -- 메인 카드, 모달
Nested card:       12px  (rounded-xl)  -- 카드 안의 서브 카드
Button:            12px  (rounded-xl)  -- 모든 버튼. 둥글둥글.
Input / Select:    10px  (rounded-lg)  -- 입력 필드
Badge / Tag:       8px   (rounded-lg)  -- 상태 배지
Avatar:            full  (rounded-full) -- 프로필 이미지
Tab pill:          10px  (rounded-lg)  -- 탭 버튼 (pill 모양까지는 X)
Tooltip:           8px   (rounded-lg)
Chart container:   16px  -- 차트 감싸는 카드
```

**절대 금지**: `rounded-none` (각진 모서리), `rounded-sm` (2-4px, 너무 날카로움)
**기본값**: 애매하면 12px (rounded-xl). 작으면 8px, 크면 16px.

### 10.8 Component Specs

#### Card

```
background:    var(--surface-1)
border:        none.  (구분선 제로 정책. surface color 차이로 구분)
border-radius: 16px
padding:       16px 20px
shadow:        none (dark mode) / 0 1px 2px rgba(0,0,0,0.04) (light mode, 극미세)
hover:         선택적. interactive card면 background를 surface-2로 transition 0.15s
```

#### Button Variants

UX 우선: 충분한 클릭 영역 (최소 40px height), 명확한 시각적 계층.

```
Primary:    bg-accent text-accent-foreground
            height: 40px, px: 20px, rounded: 12px, font-weight: 600
            hover: bg-accent-hover, transition 0.15s
            active: scale(0.98)

Secondary:  bg-surface-2 text-primary
            height: 40px, px: 20px, rounded: 12px, font-weight: 500
            hover: bg-surface-3, transition 0.15s
            border: none (구분선 제로)

Ghost:      bg-transparent text-secondary
            height: 36px, px: 12px, rounded: 10px
            hover: bg-surface-2, text-primary

Icon-only:  bg-transparent text-secondary
            size: 36px x 36px, rounded: 10px
            hover: bg-surface-2, text-primary

Small:      height: 32px, px: 12px, rounded: 8px, font-size: 13px
            (테이블 내, 카드 내 액션용)

Danger:     bg-error-muted text-error
            hover: bg-error text-white
            (삭제 등 위험 액션. 기본 상태에서는 muted, hover에서만 강렬)
```

#### Input

```
background:    var(--surface-2)  (surface-3이 아닌 surface-2. 카드 안에서 살짝만 다른 톤)
border:        none  (구분선 제로. background 차이로 인지)
border-radius: 10px
height:        40px
padding:       0 14px
font-size:     14px
color:         var(--text-primary)
placeholder:   var(--text-tertiary)
focus:         ring 2px var(--accent) at 30% opacity. (border 대신 ring)
transition:    ring 0.15s ease
```

#### Table (borderless)

```
Container:     bg-surface-1, rounded-16px, padding 0 (테이블이 카드 자체)
Header:        font-size 11px, weight 500, uppercase, letter-spacing 0.05em
               color: var(--text-tertiary). padding: 12px 16px.
               background: transparent (header row 따로 색 안 줌)
Row:           padding: 12px 16px. 
               구분: border 대신 row 사이에 1px height의 var(--surface-3) 색 gap
               hover: bg-surface-2, rounded-12px (행 자체가 둥글게 하이라이트)
Cell:          font-size 14px (Small).
Active row:    bg-accent-muted, rounded-12px
```

#### Navigation (Top Bar)

```
background:    var(--canvas)  (canvas와 동일 = 구분선 불필요)
height:        56px
padding:       0 16px
items:         font-size 14px, weight 500, color text-secondary
active item:   color text-primary, font-weight 600
               indicator: bottom 2px var(--accent) (또는 bg pill)
hover:         color text-primary
구분선:         없음. 아래쪽 border 없음. nav와 content가 하나의 surface.
```

#### Sidebar

```
background:    var(--surface-1)  (canvas보다 한 단계 밝음 = 자연스럽게 구분)
width:         240px
padding:       16px 12px
border-right:  없음. (surface color 차이로 구분)
items:         height 40px, rounded 12px, padding 0 12px
               font-size 14px, weight 400, color text-secondary
active item:   bg-accent-muted, color text-primary
               left border: 3px var(--accent), rounded-full
hover:         bg-surface-2
icon:          20px, color text-tertiary. active: color accent
```

#### Badge / Tag

```
background:    var(--accent-muted) 또는 semantic-muted
color:         var(--accent) 또는 semantic color
border:        none
border-radius: 8px
padding:       4px 10px
font-size:     11px
font-weight:   600
uppercase:     true
letter-spacing: 0.03em

Variants:
  accent:   bg accent-muted, text accent        -- new, active, highlight
  success:  bg success-muted, text success       -- resolved, deployed
  warning:  bg warning-muted, text warning       -- investigating, pending
  error:    bg error-muted, text error           -- critical, failed
  neutral:  bg surface-3, text text-secondary    -- default, archived
```

---

## 11. Motion and Interaction Design

### 11.1 Motion Library

`motion` (Framer Motion v12) -- 이미 설치됨.

### 11.2 Easing

```typescript
// Standard easing for all animations
const EASE = [0.25, 0.1, 0.25, 1.0];          // CSS ease equivalent
const EASE_OUT = [0.0, 0.0, 0.2, 1.0];         // deceleration (entering)
const EASE_IN = [0.4, 0.0, 1.0, 1.0];          // acceleration (exiting)
const SPRING = { type: "spring", stiffness: 300, damping: 30 };  // physical feel
```

### 11.3 Animation Patterns

#### Page Transition

```typescript
// Stagger children on page load
const pageVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};
```

#### Card Hover (입체감)

```typescript
// 3D tilt on hover -- 마우스 위치에 따라 기울기 변화
function TiltCard({ children }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-4, 4]);

  function handleMouse(e: React.MouseEvent) {
    const rect = ref.current!.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      {children}
    </motion.div>
  );
}
```

#### Metric Counter (숫자 카운트업)

```typescript
// Dashboard metric numbers count up from 0
function AnimatedNumber({ value, duration = 1 }: { value: number; duration?: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: EASE_OUT,
    });
    return controls.stop;
  }, [value]);

  return <motion.span>{rounded}</motion.span>;
}
```

#### Tab/Panel Switch

```typescript
// Shared layout animation for tab indicator
<motion.div layoutId="tab-indicator" className="absolute bottom-0 h-0.5 bg-accent" />

// Content cross-fade
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, x: 8 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -8 }}
    transition={{ duration: 0.2, ease: EASE }}
  />
</AnimatePresence>
```

#### Alert Entry (긴급 알림)

```typescript
// Critical alert: slides in from top with shake
const alertVariants = {
  critical: {
    initial: { opacity: 0, y: -20, scale: 0.95 },
    animate: {
      opacity: 1, y: 0, scale: 1,
      transition: { type: "spring", stiffness: 400, damping: 25 },
    },
    // Subtle shake after entry
    afterAnimate: {
      x: [0, -3, 3, -2, 2, 0],
      transition: { delay: 0.3, duration: 0.4 },
    },
  },
  info: {
    initial: { opacity: 0, y: -12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
  },
};
```

#### Drawer/Modal

```typescript
// Slide from right with backdrop fade
<AnimatePresence>
  {isOpen && (
    <>
      <motion.div
        className="fixed inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed right-0 top-0 h-full w-[400px] bg-canvas"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </>
  )}
</AnimatePresence>
```

#### Skeleton Loading

```typescript
// Shimmer effect that feels alive, not static
const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: { duration: 1.5, repeat: Infinity, ease: "linear" },
  },
};
```

#### Chart Entry

```typescript
// Bar chart bars grow from bottom
const barVariants = {
  hidden: { scaleY: 0, originY: 1 },
  show: (i: number) => ({
    scaleY: 1,
    transition: { delay: i * 0.05, duration: 0.4, ease: EASE_OUT },
  }),
};

// Line chart path draws itself
<motion.path
  d={linePath}
  initial={{ pathLength: 0 }}
  animate={{ pathLength: 1 }}
  transition={{ duration: 1.2, ease: EASE_OUT }}
/>
```

### 11.4 Motion Rules

1. **Duration**: 200-400ms for micro-interactions, 400-800ms for layout shifts
2. **No bounce**: Spring animations should feel dampened, not bouncy. `damping: 25-35`
3. **Purpose**: Every animation must serve a purpose (guide attention, show relationship, confirm action). Decoration-only animation 금지
4. **Reduce motion**: `prefers-reduced-motion` media query 존중. 해당 사용자에게는 `duration: 0`
5. **No jank**: 60fps 보장. `transform`과 `opacity`만 애니메이션. `width`, `height`, `top`, `left` 애니메이션 금지
6. **Exit**: 들어올 때보다 나갈 때가 빨라야 함 (enter: 300ms, exit: 200ms)

---

## 12. Performance Optimization

### 12.1 Frontend

| Area | Strategy |
|---|---|
| Bundle | Next.js automatic code splitting + dynamic imports for heavy components (chart library) |
| Images | `next/image` with Supabase Storage CDN. WebP/AVIF auto-format |
| Fonts | `next/font/google` for Geist (self-hosted, no CLS) |
| Data | SWR with `dedupingInterval` + `revalidateOnFocus: false` for dashboard data |
| Rendering | Server components for static layouts, client components only where interactivity needed |
| CSS | Tailwind v4 purges unused styles. No runtime CSS-in-JS |

### 12.2 Backend

| Area | Strategy |
|---|---|
| Response cache | Redis cache for frequently read, slowly changing data (project list, insights). TTL 5-30 min |
| DB queries | Indexed columns, partial indexes, no N+1 |
| Connection pool | Supabase PgBouncer (transaction mode). Max 20 connections |
| Async I/O | All external API calls via `httpx.AsyncClient`. No blocking I/O in async handlers |
| Pagination | Cursor-based (not offset) for all list endpoints |
| Rate limiting | Per-user rate limit on expensive endpoints (AI generation: 10/min, SNS publish: 5/min) |
| Background | Heavy work (AI generation, metrics sync) offloaded to background tasks |

### 12.3 Database

| Area | Strategy |
|---|---|
| Indexes | Composite indexes on (project_id, created_at DESC) for all project-scoped tables |
| Partial indexes | Active records only (WHERE status != 'resolved', WHERE is_read = false) |
| JSONB | GIN index on jsonb columns if queried (currently not needed) |
| Vacuum | Supabase handles autovacuum. Monitor `pg_stat_user_tables` for dead tuple ratio |
| Query analysis | `EXPLAIN ANALYZE` on slow queries. Target: < 50ms for all common queries |

---

## 13. Security

### 13.1 Authentication

- Supabase Auth handles Google OAuth, JWT issuance, session management
- Backend validates JWT on every request (HS256 with Supabase anon key)
- No custom password storage

### 13.2 Authorization

- RLS on every table (DB level enforcement)
- Route-level: `verify_project_access` dependency checks user owns the project
- Service_role_key: used ONLY for system operations (webhook handlers, background tasks)
- User-context operations use anon key + user JWT

### 13.3 Data Protection

- OAuth tokens encrypted at rest (Fernet symmetric encryption)
- Encryption key in environment variable, never in code
- `.env` files in `.gitignore`
- No secrets in git history

### 13.4 Input Validation

- Pydantic models validate all request bodies (backend)
- Zod schemas validate all form inputs (frontend)
- SQL injection: impossible (Supabase client parameterizes all queries)
- XSS: React auto-escapes. `dangerouslySetInnerHTML` 사용 금지

### 13.5 Webhook Verification

```python
# Each webhook provider has signature verification
import hmac, hashlib

def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

def verify_vercel_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), payload, hashlib.sha1).hexdigest()
    return hmac.compare_digest(expected, signature)
```

### 13.6 Rate Limiting

```python
# Expensive endpoints need rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/{project_id}/promotion/generate")
@limiter.limit("10/minute")
async def generate_promotion(...):
    ...
```

---

## 14. Deployment Architecture

### 14.1 Infrastructure

```
[Vercel]  <-- frontend (Next.js)
    |
    | HTTPS
    v
[Railway] <-- backend (FastAPI + APScheduler)
    |
    |--- [Supabase] (PostgreSQL + Auth + Realtime + Storage)
    |--- [Upstash Redis] (cache + rate limit)
```

### 14.2 Environment Variables

#### Frontend (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=           # Railway backend URL
```

#### Backend (Railway)

```
# Supabase
SUPABASE_URL=
SUPABASE_KEY=                  # anon key
SUPABASE_SERVICE_ROLE_KEY=     # for system operations only

# Frontend
FRONTEND_URL=                  # Vercel URL (CORS)

# AI
GEMINI_API_KEY=

# External Services OAuth
X_CLIENT_ID=
X_CLIENT_SECRET=
THREADS_APP_ID=
THREADS_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
VERCEL_TOKEN=                  # or OAuth
RAILWAY_TOKEN=                 # or OAuth

# Security
ENCRYPTION_KEY=                # Fernet key for token encryption

# Webhooks
GITHUB_WEBHOOK_SECRET=
VERCEL_WEBHOOK_SECRET=

# Redis
REDIS_URL=                     # Upstash Redis URL
```

### 14.3 CI/CD

- Frontend: Vercel auto-deploy on push to `main`
- Backend: Railway auto-deploy on push to `main`
- Branch previews: Vercel preview deployments for PRs

---

## 15. Phase Roadmap

### Phase 1: Foundation (Core Infrastructure)

**Goal**: 백엔드-프론트 연동, 인증 정상화, 기본 CRUD 동작

1. Backend service layer 구조 수립 (routes -> services 분리)
2. Frontend mock data 제거, SWR + 실제 API 호출로 전환
3. 프로젝트 CRUD 완전 연동 (create, list, detail, update, delete)
4. 이벤트 CRUD 연동
5. 이슈 CRUD 연동
6. DB 스키마 마이그레이션 (확장된 스키마 적용)
7. Error handling 통합 (backend: AppError, frontend: ErrorBoundary + toast)
8. Loading states (skeleton loaders)

### Phase 2: Design System Overhaul

**Goal**: 전체 UI를 프로덕션 수준으로 재디자인

1. DESIGN.md 전면 재작성 (Vercel/Linear/Supabase 레퍼런스)
2. globals.css 재작성 (새 color system, typography, spacing)
3. shadcn/ui 컴포넌트 커스터마이징
4. Layout 리디자인 (sidebar, header, content area)
5. Dashboard 페이지 리디자인
6. 각 서브 페이지 리디자인
7. Motion 시스템 적용 (page transitions, card interactions, chart animations)
8. Dark/light mode 완전 검증
9. Responsive (mobile, tablet, desktop)

### Phase 3: External Integrations

**Goal**: X, Threads, GitHub, Vercel, Railway 연동

1. connected_accounts 테이블 + CRUD API
2. Token encryption 구현
3. X OAuth 플로우 + 기본 API (post, read, metrics)
4. Threads OAuth 플로우 + 기본 API (post, read, metrics)
5. GitHub OAuth + repo 연동 (info, commits, issues)
6. Vercel API 연동 (deployments, webhooks)
7. Railway GraphQL API 연동 (deployments, metrics, webhooks)
8. Webhook receiver endpoints + signature verification
9. 온보딩 플로우에 SNS/Deploy 연결 단계 추가
10. Settings 페이지에서 계정 관리 UI

### Phase 4: AI and Insights

**Goal**: 프로모션 AI 고도화 + 시장/마케팅/운영 인사이트

1. Promotion LLM 프롬프트 전면 개선 (컨텍스트 + 과거 성과 반영)
2. SNS 직접 게시 기능 (X, Threads)
3. 예약 게시 (scheduled posts + background worker)
4. SNS metrics 수집 worker (30분 주기)
5. Marketing insights 대시보드 (실제 데이터)
6. Market insights 생성 (Gemini search grounding + 주기적 크롤링)
7. Operations insights (배포 로그 + 에러율 + GitHub activity)
8. Token refresh background worker

### Phase 5: Real-time and Alerts

**Goal**: 실시간 알림 시스템 + 긴급 상황 대응

1. Alerts 테이블 + API
2. Supabase Realtime subscription (프론트)
3. Alert bell UI + toast system
4. Deployment error -> alert pipeline
5. Traffic anomaly detection -> alert
6. SNS viral detection -> alert
7. Market urgent insight -> alert
8. Token expiring -> alert
9. Alert preferences (사용자별 알림 설정)

### Phase 6: Polish and Production

**Goal**: 프로덕션 배포 준비

1. E2E 테스트 (critical paths)
2. Performance audit (Lighthouse, bundle analysis)
3. Accessibility audit (WCAG AA)
4. Error tracking (Sentry or similar)
5. Production deployment setup
6. Monitoring dashboard

---

## Appendix A: Environment Variable Checklist

| Variable | Required | Default | Used By |
|---|---|---|---|
| `SUPABASE_URL` | Yes | - | Backend |
| `SUPABASE_KEY` | Yes | - | Backend |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | - | Backend |
| `GEMINI_API_KEY` | Yes | - | Backend |
| `FRONTEND_URL` | Yes | `http://localhost:3000` | Backend (CORS) |
| `X_CLIENT_ID` | Phase 3 | - | Backend |
| `X_CLIENT_SECRET` | Phase 3 | - | Backend |
| `THREADS_APP_ID` | Phase 3 | - | Backend |
| `THREADS_CLIENT_SECRET` | Phase 3 | - | Backend |
| `GITHUB_CLIENT_ID` | Phase 3 | - | Backend |
| `GITHUB_CLIENT_SECRET` | Phase 3 | - | Backend |
| `VERCEL_TOKEN` | Phase 3 | - | Backend |
| `RAILWAY_TOKEN` | Phase 3 | - | Backend |
| `ENCRYPTION_KEY` | Phase 3 | - | Backend |
| `GITHUB_WEBHOOK_SECRET` | Phase 3 | - | Backend |
| `VERCEL_WEBHOOK_SECRET` | Phase 3 | - | Backend |
| `REDIS_URL` | Phase 4 | - | Backend |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | - | Frontend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | - | Frontend |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:8000` | Frontend |

## Appendix B: External Service Developer Account Setup

### X (Twitter)

1. https://developer.x.com 에서 개발자 계정 신청
2. App 생성 -> OAuth 2.0 설정 -> Redirect URI 등록
3. Client ID + Client Secret 발급
4. Scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`

### Threads (Meta)

1. https://developers.facebook.com 에서 앱 생성
2. Threads API 제품 추가
3. OAuth Redirect URI 등록
4. 테스트 사용자 추가 (App Review 전까지 테스트 사용자만 사용 가능)
5. App Review 통과 필요 (production 배포 시)

### GitHub

1. GitHub Settings > Developer Settings > OAuth Apps > New
2. Authorization callback URL 등록
3. Client ID + Client Secret 발급
4. Scopes: `repo`, `read:org`, `admin:repo_hook`

### Vercel

1. Vercel Dashboard > Settings > Tokens > Create
2. 또는 OAuth Integration 등록 (사용자별 연동 시)
3. Webhook: Project Settings > Webhooks > Add

### Railway

1. Railway Dashboard > Workspace Settings > Tokens > Create
2. 또는 OAuth App 등록 (Workspace Settings > Developer)
3. Webhook: Project Settings > Webhooks > Add URL
