# LaunchPad → Autonomous Marketing Platform (AMP)
## Master Specification v2.0

> 작성일: 2026-05-16 (현재 코드 + 2026 시장 리서치 + 구체 구현 패턴 통합)
> 작성자: Claude (with masonl2ee)
> 상태: Final Draft
> 목적: "한 번에 제대로" 작동하는 완전 자율 AI 마케팅 시스템의 전체 청사진.
>       단계별 모호함 없이 모든 모듈/스키마/API/파이프라인/UI/비용/위험을 정의.

---

## ⚠️ 스코프: Internal Use Mode (2026-05-16 확정)

**1차 사용자**: 본인 + Next-TeamA 팀 내부.
**Out of Scope** (deprioritized): 가격 플랜 / Stripe 결제 / Landing 마케팅 / 약관·Privacy·DPA / 외부 사용자 온보딩.
**우선순위**: 핵심 자동화 파이프라인 + 영상 + 멀티 채널 + 페르소나 + 자율성 + 안전장치 + MCP.

§13 (가격 모델), §부록 B.2 (Free 플랜 정책), §14 (컴플라이언스 멀티 테넌시 부분), §17 (인프라 분리)은 향후 SaaS화 시 참조용으로 보존. 현재 구현은 단일/소수 사용자 가정.

---

## 0. 의사결정 한눈에

| 항목 | 결정 | 근거 |
|---|---|---|
| 오케스트레이션 | **LangGraph** + Postgres Checkpointer | production audit/rollback 필수 |
| 에이전트 수 | **6개** specialized + 1 orchestrator | 단일 에이전트 한계, role 분리 |
| LLM 라우팅 | **3-tier** (Gemini Flash / GPT-4.1 Mini / Claude Sonnet 4.6) | task 복잡도별 비용 최적화 |
| 영상 기본 | **Kling 3.0 via fal.ai** ($0.10/sec) | Veo 4.7배 비쌈, 일일 발행용 적정 |
| 영상 프리미엄 | **Veo 3.1** (캠페인/런칭만) | 4K + 네이티브 오디오 |
| 음성 | **ElevenLabs Turbo v2.5** (TTS), 추후 voice clone | 250ms 레이턴시, 50% 저렴 |
| 자막 | **Whisper API verbose_json** + 자체 wrap | 한국어 wrap 보정 필요 |
| 합성 | **ffmpeg + xfade + amix + subtitles burn-in** | 플랫폼이 sidecar SRT 제거함 |
| 영상 저장 | **Cloudflare R2** (zero egress) | Supabase 대비 egress 무료 |
| X 자율 답글 | **절대 금지**, 항상 휴먼 게이트 | 계정 정지 사유 (2026 X 정책) |
| Threads/IG/YT 답글 | **자율 가능** (신뢰도 임계값 기반) | API 명시적 허용 |
| 페르소나 학습 | **RAG (Stage 1) + Fine-tune (Stage 2, Pro)** | 50 sample부터 GPT-4 mini FT |
| 결제 모델 | **BYOK + 플랫폼 fee** ($29-249/mo) | 영상 비용 변동 흡수 |
| 마이그레이션 | **feature flag per task type**, shadow mode 2주 | 기존 동작 안 깨뜨림 |

---

## 1. 현재 LaunchPad 상태 (Audit 결과)

기획은 "scratch에서 만들기"가 아니라 **이미 있는 것 위에 쌓기**. 현재 구현된 것:

### 1.1 백엔드 (이미 작동중)
- **단일 agent 루프** (`backend/app/agents/core.py:127-273`) — Gemini 2.5 Flash + 31개 tool + skill 자동 선택
- **8개 skill 파일** (`backend/app/workspace/default_skills/*.md`): promotion, deploy_analysis, deep_code_analysis, market_research, weekly_report, health_check, web_search, threads_operator_campaign
- **6개 tool domain**: github (7), deploy (5), sns (9 — promotion_references 포함), market (3), knowledge (3), internal (4)
- **10개 scheduler job**: smart_sync_metrics(30분), publish_scheduled(5분), refresh_tokens(1h), daily_market_insights(8 UTC), weekly_reports(월요 9 UTC), cleanup_oauth(1h), sync_knowledge(6h), health_ping(5분), daily_health_check(9:30 UTC), daily_market_analysis(10 UTC)
- **5개 OAuth 통합**: GitHub, Vercel, Railway, X, Threads
- **DB**: projects, connected_accounts, project_promotion_info, promotion_posts, sns_metrics_snapshots, market_insights, deployment_logs, alerts, project_knowledge, promotion_references, promotion_campaigns
- **워크스페이스 시스템**: 프로젝트별 Supabase Storage 폴더, skill 파일 + auto-generated README

### 1.2 프론트엔드 (이미 작동중)
- **대시보드** (`/projects/[id]`): promotion stats + marketing/operations insights + 캘린더
- **프로모션 캘린더** (`/projects/[id]/promotion`): 월/피드 토글, 발행 예약, 일괄 삭제
- **에디터** (`/projects/[id]/promotion/post/[postId]`): hook/content 편집, 이미지 업로드, 톤/타입, 멀티 플랫폼, 발행/예약
- **인사이트** (`/projects/[id]/insights`): 마케팅(임프레션/참여/플랫폼), 운영(이슈/시장/멘션)
- **운영 현황** (`/projects/[id]/issues`): 배포 로그 + 이슈 + 서비스 헬스
- **설정/온보딩**: 5-step (PRD → GitHub → Deploy → SNS → Complete)

### 1.3 작동중 핵심 파이프라인
1. **생성 파이프라인**: 사용자 요청 → KB + reference 로드 → Gemini JSON 생성 → promotion_posts 저장 → 수동 편집 → 발행 (X/Threads 동기 호출)
2. **에러 분석 파이프라인**: 배포 실패 → 로그 fetch → Gemini → root_cause/fix → alert 생성
3. **딥 분석 파이프라인**: 에러 → 파일 경로 추출 → GitHub 코드 fetch → recent diff → Gemini → 수정 제안
4. **지식 동기화**: 6h마다 commits/PRs/deploys/SNS/market → project_knowledge + workspace README
5. **에이전트 태스크**: `/agent/run` → context 빌드 → skill 선택 → Gemini 루프 → audit log 리턴

### 1.4 격차 (이 기획에서 채워야 할 것)
- ❌ LangGraph 미사용 (단일 루프 → 복잡한 흐름 표현 불가, checkpoint 없음)
- ❌ 멀티 에이전트 분업 없음 (Strategy/Engagement/AssetGen/RiskGuard/Performance 부재)
- ❌ Instagram/YouTube/TikTok/LinkedIn 미통합
- ❌ 영상 자동 생성 파이프라인 없음 (fal.ai/Veo/Kling/Sora 미연결)
- ❌ ElevenLabs/Whisper 미연결
- ❌ 멘션/답글 자동 감지 시스템 없음 (X Filtered Stream, Threads polling)
- ❌ 페르소나/voice 학습 부재 (사용자 voice 매칭 X)
- ❌ Human-in-the-loop 승인 큐 UI 없음
- ❌ Rate limit / Cost / Shadowban 모니터 없음 (스케줄러는 있지만 가드 없음)
- ❌ 휴먼-라이크 발행 시간 분포 알고리즘 없음 (단순 scheduled_at)
- ❌ 성과 학습 루프 없음 (인사이트는 있지만 학습으로 반영 X)
- ❌ LLM 단일 모델 (Gemini Flash만) — 복잡한 작업도 같은 모델
- ❌ R2/Redis/Celery 미사용 (영상 큐, 캐시 필요)
- ❌ pgvector 미사용 (중복/유사도 검출 불가)

---

## 2. 목표 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│   FRONTEND (Next.js 16)                                          │
│  Dashboard │ Agent Console │ Approval Queue │ Calendar │         │
│  Persona Setup │ Video Studio │ Insights × 3 │ Automation Rules  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTPS (Supabase Auth JWT)
┌─────────────────────────────────────────────────────────────────┐
│   API GATEWAY (FastAPI)  ← 기존 main.py 확장                      │
│   Rate Limit · Auth · Project Access · Cost Tracker · Audit       │
└─────────────────────────────────────────────────────────────────┘
              │              │              │
              ▼              ▼              ▼
┌───────────────────┐  ┌──────────────┐  ┌──────────────────┐
│  ORCHESTRATOR     │  │  WEBHOOK     │  │  PUBLIC API      │
│  (LangGraph)      │  │  ROUTER      │  │  (CRUD/Settings) │
│  + Checkpointer   │  │  + Streamer  │  │                  │
└───────────────────┘  └──────────────┘  └──────────────────┘
       │                     │
       │ Trigger             │ Events (push/deploy/mention)
       ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│   AGENT SWARM (6 LangGraph Nodes + Orchestrator)                 │
├──────────────┬──────────────┬──────────────┬──────────────┬─────┤
│ Strategy     │ Content      │ Engagement   │ AssetGen     │Risk │
│ (Flash)      │ (Sonnet 4.6) │ (Flash+Mini) │ (Flash)      │Grd  │
├──────────────┴──────────────┴──────────────┴──────────────┴─────┤
│              Performance Agent (배경 작업)                       │
└─────────────────────────────────────────────────────────────────┘
       │                     │                     │
       ▼                     ▼                     ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│ LLM Router   │  │ Media Pipeline   │  │ Platform Publishers   │
│ Gemini/      │  │ fal.ai · 11labs  │  │ X · Threads · IG · YT │
│ Claude/GPT   │  │ Whisper · ffmpeg │  │ TikTok · LinkedIn     │
└──────────────┘  └──────────────────┘  └──────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│   DATA LAYER (Supabase + R2 + Redis)                              │
│   PG (+ pgvector) · Storage(이미지) · R2(영상) · Redis(큐/캐시)  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│   BACKGROUND WORKERS                                              │
│   APScheduler (기존 10개) + Celery (영상 큐) + X Filtered Stream   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│   OBSERVABILITY: Sentry · PostHog · LangSmith(60일) · Grafana    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 핵심 데이터 플로우

**Flow A: 이벤트 → 자율 콘텐츠 → 발행** (LangGraph)
```
GitHub webhook (push)
  → /api/webhooks/github (기존)
  → Orchestrator.start_graph("content_creation", {event})
  → [Strategy node] 발행 가치 판단 (Flash, 5초)
      ↓ should_publish?
  → [Content node] 채널별 카피 작성 (Sonnet 4.6, 8초)
      ↓ needs_assets?
  → [AssetGen node] 스크린샷/이미지/영상 (Flash + media pipeline, 30s-5min)
  → [RiskGuard node] 5단계 가드 (병렬, 3초)
      ↓ requires_approval?
  → [Human Gate] (interrupt — 사용자 알림 + 큐)
      ↓ approval
  → [Publish node] 플랫폼 API (병렬, 5초)
  → [Performance node] 1h/6h/24h/7d 메트릭 수집 스케줄링
END
```

**Flow B: 멘션 → 답글 초안 → 발행**
```
X Filtered Stream (24/7 connection)
  → Engagement worker
  → Classifier → DB(interactions)
  → Orchestrator.start_graph("engagement", {interaction})
  → [Engagement node] 분류 + 응답 필요 판단
      ↓ should_respond? (X=항상 휴먼, 다른 채널=신뢰도 기반)
  → [Content node] 답글 초안 (사용자 voice 매칭)
  → [RiskGuard node]
      ↓ X 또는 신뢰도 < 0.85
  → [Human Gate] (interrupt)
      ↓ approval
  → [Delay node] 휴먼-라이크 지연 (30s-6h)
  → [Publish node]
END
```

**Flow C: 영상 자율 생성 (주간 일요일 22 KST)**
```
APScheduler weekly trigger
  → Orchestrator.start_graph("video_production", {project_id, type:"weekly_summary"})
  → [Strategy node] 한 주 활동 요약 데이터 수집
  → [Content node] 영상 스크립트 작성 (Sonnet 4.6)
      → 30초 / 6 scenes 분할
  → [AssetGen node] Celery 큐로 위임
      → 6개 Kling 3.0 병렬 생성 (webhook 콜백)
      → ElevenLabs TTS 내레이션
      → Whisper SRT 자막
      → ffmpeg 합성 (9:16 1080×1920)
      → CLIP/blur/stuck-frame quality gate
      → 실패 시 자동 regen 1회, 또 실패 시 human review
  → [RiskGuard node] 콘텐츠 모더레이션 + 비용 정산
  → [Human Gate] (영상 미리보기 → 1-click 승인)
      ↓ approved
  → [Publish node] YouTube Shorts + IG Reels + TikTok 병렬
  → [Performance node]
END
```

---

## 3. 6개 에이전트 상세 (with 기존 스킬 매핑)

### 3.1 LangGraph State (공통)

```python
# backend/app/agents/graph_state.py
from typing import TypedDict, Annotated, Literal
from langgraph.graph.message import add_messages
from operator import add

class AMPState(TypedDict):
    project_id: str
    user_id: str
    trigger: dict                                      # {type, source_id, payload}
    context: dict                                      # AgentContext (knowledge, tokens, persona)

    # Strategy output
    strategy: dict | None
    # Content output
    drafts: list[dict]                                 # multi-channel variants
    # AssetGen output
    assets: list[dict]
    # RiskGuard output
    risk: dict | None
    # Approval
    approval_status: Literal["pending", "approved", "rejected"] | None
    requires_approval: bool
    # Publishing
    publish_results: list[dict]
    # Performance
    performance_schedule: list[str]                    # ['+1h', '+6h', ...]

    # Cross-cutting reducers
    messages: Annotated[list, add_messages]
    tool_audit: Annotated[list[dict], add]
    cost_usd: Annotated[float, add]
    tier_used: dict[str, str]                          # node -> model

    current_node: str
    error: str | None
```

Thread ID 패턴: `{project_id}:{graph_name}:{event_id}` — 동시 실행 충돌 방지.

### 3.2 Strategy Agent

**책임**: 무엇을, 어디에, 언제 발행할지 결정
**LLM**: Gemini 2.5 Flash (Tier 1)
**기존 스킬 활용**: 새로 작성 (`strategy.md`)
**도구**: 기존 sns_tools, knowledge_tools, github_tools, market_tools 재사용

```python
async def strategy_node(state: AMPState) -> dict:
    declarations, handlers = get_tools_for_domains(
        ["sns", "knowledge", "github", "market"]
    )
    llm = route_llm("strategy", complexity="low")
    prompt = load_skill_prompt("strategy")

    # 트리거별 컨텍스트 augment
    if state["trigger"]["type"] == "github.push":
        commits = await handlers["github_list_commits"].handler(
            per_page=5, ctx=state["context"]
        )
        state["messages"].append({"role": "user", "content": f"Commits:\n{commits}"})

    response = await llm.ainvoke([
        {"role": "system", "content": prompt},
        {"role": "user", "content": f"Event: {state['trigger']}"},
    ], tools=declarations)

    decision = parse_json(response.content)
    return {
        "strategy": decision,
        "tier_used": {"strategy": "flash"},
        "cost_usd": response.usage.cost,
        "current_node": "strategy",
    }
```

**의사결정 JSON**:
```json
{
  "should_publish": true,
  "reasoning": "feat: dark mode is a high-value UX win",
  "channels": ["x", "threads", "instagram"],
  "format": "image_post",
  "urgency": "now",
  "estimated_engagement": 75,
  "image_needed": true,
  "video_needed": false
}
```

### 3.3 Content Agent

**책임**: 사용자 voice 매칭 카피 작성 (멀티 채널)
**LLM**: Claude Sonnet 4.6 (Tier 3 — 품질 중요)
**기존 스킬 활용**: `promotion.md` (기존), 채널별 sub-skill 추가 (`content_x.md`, `content_threads.md`, `content_instagram.md`, `content_youtube.md`, `content_tiktok.md`, `content_linkedin.md`)

**Voice Matching 흐름**:
1. **RAG**: pgvector로 사용자 과거 글에서 주제 가장 비슷한 5개 + 가장 잘 된 10개 fetch
2. 페르소나 프로필 + voice samples 프롬프트에 주입
3. Claude로 3개 variant 생성
4. self-critique (voice_match_score 0-1)
5. 임베딩 → 중복 체크 (cosine > 0.85면 폐기)

### 3.4 Engagement Agent

**책임**: 멘션/DM/댓글 분류 + 답글 초안
**LLM**: Gemini Flash (분류) + GPT-4.1 Mini (답글 초안)
**기존 스킬 활용**: 신규 `engagement.md`
**도구**: 신규 — `mention_get_thread`, `sender_profile_lookup`, `similar_past_reply_search`

**플랫폼별 자율성 매트릭스** (DB `project_settings` 사용자 설정 가능):
| 플랫폼 | default 자율 답글 | 조건 |
|---|---|---|
| X | OFF (강제) | 정책상 영구 OFF |
| Threads | OFF → user opt-in | 신뢰도 ≥ 0.85 & 분류 ≠ criticism |
| Instagram | OFF → user opt-in | 좋아요만 자율 가능 |
| YouTube | OFF → user opt-in | 답글만, 좋아요/구독 X |
| LinkedIn | OFF (강제) | 정책 모호, 안전 우선 |

### 3.5 Asset Generation Agent

**책임**: 이미지/영상/오디오 자동 생성 (Celery 위임)
**LLM**: Gemini Flash (의사결정), 미디어 생성은 외부
**기존 스킬 활용**: 신규 `asset_generation.md`

**의사결정 트리**:
```
strategy.image_needed == true:
  format == 'screenshot' → Puppeteer (무료)
  format == 'illustration' → Flux Pro ($0.05)
  format == 'photo' → Imagen 3 ($0.04)
  format == 'meme' → DALL-E 3 + 오버레이

strategy.video_needed == true:
  use_case == 'weekly_summary' → Kling 3.0 (default)
  use_case == 'launch' → Veo 3.1 (사용자 budget 확인)
  use_case == 'tutorial' → 화면녹화 + AI 보조
```

→ 영상 파이프라인 상세는 **§7** 참조

### 3.6 Risk Guard Agent

**책임**: 5단계 가드 (병렬)
**LLM**: 부분만 (모더레이션은 OpenAI Moderation API, 무료)
**기존 스킬 활용**: 신규 `risk_guard.md`

```python
async def risk_guard_node(state: AMPState) -> dict:
    checks = await asyncio.gather(
        check_content_moderation(state),     # OpenAI Moderation
        check_duplicate(state),              # pgvector 유사도
        check_rate_limit(state),             # rate_limit_tracker 테이블
        check_cost_budget(state),            # cost_ledger 합계
        check_shadowban_risk(state),         # shadowban_checks 테이블
    )

    blocking = [c for c in checks if c.severity == "block"]
    warning = [c for c in checks if c.severity == "warn"]

    return {
        "risk": {
            "approved": len(blocking) == 0,
            "blocking_reasons": [c.reason for c in blocking],
            "warnings": [c.reason for c in warning],
            "score": sum(c.score for c in checks) / 5,
        },
        "requires_approval": (
            len(blocking) > 0
            or any(c.severity == "warn" for c in checks)
            or state["trigger"]["type"] == "mention.x"  # X는 항상
        ),
        "current_node": "risk_guard",
    }
```

### 3.7 Performance Agent

**책임**: 발행 후 메트릭 수집 + 학습 인사이트 생성
**기존 활용**: `weekly_report.md` 스킬 + `sns_metrics_snapshots` 테이블 + 기존 `insight_engine.py`
**확장**: 1h/6h/24h/7d 스케줄링 + pgvector로 패턴 클러스터링

기존 스케줄러 잡 `smart_sync_metrics`(30분), `weekly_reports`를 그대로 활용. 신규 잡 `content_perf_snapshot`(매 5분, 발행 후 +1h/+6h/+24h/+7d 시점 도래한 콘텐츠 메트릭 수집).

---

## 4. 데이터 모델 변경 (델타)

기존 테이블 유지, **신규/확장만** 명시:

### 4.1 기존 테이블 확장

```sql
-- 008_amp_extensions.sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS
  autonomy_level text NOT NULL DEFAULT 'assisted'
    CHECK (autonomy_level IN ('manual', 'assisted', 'autonomous')),
  agent_backend text NOT NULL DEFAULT 'legacy'
    CHECK (agent_backend IN ('legacy', 'langgraph', 'shadow')),
  daily_post_budget int DEFAULT 10,
  monthly_cost_budget_usd numeric(10,2) DEFAULT 50,
  brand_palette jsonb DEFAULT '[]',
  brand_voice_traits jsonb DEFAULT '[]',
  target_audience text,
  preferred_publish_times jsonb DEFAULT '{}',
  blocked_topics text[] DEFAULT '{}',
  required_hashtags text[] DEFAULT '{}',
  timezone text DEFAULT 'Asia/Seoul';

-- 채널 확장
ALTER TABLE connected_accounts DROP CONSTRAINT IF EXISTS connected_accounts_provider_check;
ALTER TABLE connected_accounts ADD CONSTRAINT connected_accounts_provider_check
  CHECK (provider IN (
    'x', 'threads', 'instagram', 'youtube', 'tiktok',
    'linkedin', 'bluesky', 'mastodon', 'facebook',
    'github', 'vercel', 'railway',
    'elevenlabs', 'fal'  -- BYOK용
  ));

-- promotion_posts → 확장 (LangGraph 트레이싱 + 페르소나 점수)
ALTER TABLE promotion_posts ADD COLUMN IF NOT EXISTS
  workflow_run_id uuid,
  voice_match_score numeric,
  embedding vector(1536),
  ai_metadata jsonb DEFAULT '{}',
  cost_usd numeric(10,4) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_promotion_embedding ON promotion_posts
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- promotion_posts.status 추가
ALTER TABLE promotion_posts DROP CONSTRAINT IF EXISTS promotion_posts_status_check;
ALTER TABLE promotion_posts ADD CONSTRAINT promotion_posts_status_check
  CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected',
                    'scheduled', 'publishing', 'published', 'failed'));
```

### 4.2 신규 테이블

```sql
-- ============= pgvector 활성화 =============
CREATE EXTENSION IF NOT EXISTS vector;

-- ============= Voice & Persona =============
CREATE TABLE personas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  voice_profile   jsonb NOT NULL DEFAULT '{}',
  topic_clusters  jsonb DEFAULT '[]',
  opinion_corpus  jsonb DEFAULT '[]',
  forbidden_phrases text[] DEFAULT '{}',
  preferred_phrases text[] DEFAULT '{}',
  ft_model_id     text,
  ft_training_status text DEFAULT 'none'
    CHECK (ft_training_status IN ('none', 'pending', 'training', 'ready', 'failed')),
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE voice_samples (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_platform  text NOT NULL,
  source_post_id   text,
  content          text NOT NULL,
  engagement_score numeric,
  embedding        vector(1536),
  used_for_training boolean DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_voice_embedding ON voice_samples USING ivfflat (embedding vector_cosine_ops);

-- ============= Media Assets & Video =============
CREATE TABLE media_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type      text NOT NULL CHECK (asset_type IN ('image', 'video', 'audio', 'gif')),
  source          text NOT NULL CHECK (source IN ('user_upload','screenshot','ai_generated','stock')),
  ai_model        text,
  prompt          text,
  storage_url     text NOT NULL,
  thumbnail_url   text,
  duration_seconds numeric,
  width int, height int,
  file_size_bytes bigint,
  cost_usd        numeric(10,4) DEFAULT 0,
  generation_metadata jsonb DEFAULT '{}',
  parent_id       uuid REFERENCES media_assets(id),
  quality_score   numeric,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE video_projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  script          jsonb NOT NULL,
  narration_text  text,
  total_duration_seconds numeric,
  aspect_ratio    text NOT NULL DEFAULT '9:16',
  model           text NOT NULL DEFAULT 'kling-3.0',
  status          text NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning','queued','generating_scenes','generating_audio',
                      'compositing','quality_check','ready','failed','human_review')),
  progress_percent int DEFAULT 0,
  final_asset_id  uuid REFERENCES media_assets(id),
  total_cost_usd  numeric(10,4) DEFAULT 0,
  workflow_run_id uuid,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

CREATE TABLE video_scenes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_project_id uuid NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
  scene_index     int NOT NULL,
  description     text NOT NULL,
  duration_seconds numeric NOT NULL,
  prompt          text,
  asset_id        uuid REFERENCES media_assets(id),
  fal_request_id  text,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','generating','quality_check','ready','failed')),
  retry_count     int DEFAULT 0,
  generation_started_at timestamptz,
  generation_completed_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============= Interactions =============
CREATE TABLE interactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        text NOT NULL,
  interaction_type text NOT NULL
    CHECK (interaction_type IN ('mention','reply','dm','comment','quote')),
  external_id     text NOT NULL,
  parent_post_id  text,
  sender_username text NOT NULL,
  sender_profile  jsonb DEFAULT '{}',
  content         text NOT NULL,
  raw_data        jsonb,
  detected_at     timestamptz NOT NULL DEFAULT now(),
  classification  text,
  priority        text DEFAULT 'medium',
  draft_reply     text,
  reply_status    text DEFAULT 'pending'
    CHECK (reply_status IN ('pending','draft_ready','approved','sent','ignored','human_handled')),
  reply_sent_at   timestamptz,
  reply_external_id text,
  ai_metadata     jsonb DEFAULT '{}',
  UNIQUE(platform, external_id)
);
CREATE INDEX idx_interactions_project_status ON interactions(project_id, reply_status);

-- ============= Automation Rules =============
CREATE TABLE automation_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            text NOT NULL,
  enabled         boolean NOT NULL DEFAULT true,
  trigger_type    text NOT NULL,
  trigger_config  jsonb NOT NULL,
  actions         jsonb NOT NULL,
  conditions      jsonb DEFAULT '{}',
  last_triggered_at timestamptz,
  trigger_count   int DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============= Workflow & LangGraph =============
CREATE TABLE workflow_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rule_id         uuid REFERENCES automation_rules(id),
  graph_name      text NOT NULL,
  thread_id       text NOT NULL UNIQUE,
  status          text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','paused_awaiting_approval','completed','failed','cancelled')),
  current_node    text,
  state_snapshot  jsonb,
  error_message   text,
  cost_usd        numeric(10,4) DEFAULT 0,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);
-- LangGraph 자체 checkpoint 테이블은 langgraph-checkpoint-postgres가 별도 생성

-- ============= Safety Layer =============
CREATE TABLE rate_limit_tracker (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform        text NOT NULL,
  endpoint        text NOT NULL,
  window_start    timestamptz NOT NULL,
  window_end      timestamptz NOT NULL,
  current_count   int DEFAULT 0,
  limit_count     int NOT NULL,
  UNIQUE(project_id, platform, endpoint, window_start)
);

CREATE TABLE cost_ledger (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service         text NOT NULL,
  operation       text NOT NULL,
  cost_usd        numeric(10,6) NOT NULL,
  tokens_used     int,
  units_used      numeric,
  related_draft_id uuid REFERENCES promotion_posts(id),
  related_asset_id uuid REFERENCES media_assets(id),
  related_video_id uuid REFERENCES video_projects(id),
  workflow_run_id uuid REFERENCES workflow_runs(id),
  occurred_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cost_project_date ON cost_ledger(project_id, occurred_at DESC);

CREATE TABLE shadowban_checks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform        text NOT NULL,
  checked_at      timestamptz NOT NULL DEFAULT now(),
  recent_avg_impressions numeric,
  baseline_avg_impressions numeric,
  ratio           numeric,
  is_suspicious   boolean DEFAULT false,
  consecutive_suspicious_days int DEFAULT 0,
  action_taken    text
);

-- ============= Approval Queue =============
CREATE TABLE approval_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type       text NOT NULL,
  item_id         uuid NOT NULL,
  workflow_run_id uuid REFERENCES workflow_runs(id),
  thread_id       text,
  priority        text NOT NULL DEFAULT 'normal',
  context         jsonb,
  ai_recommendation text,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
  notified_via    text[] DEFAULT '{}',
  notified_at     timestamptz,
  decided_at      timestamptz,
  decided_by      uuid,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_approval_user_status ON approval_queue(user_id, status)
  WHERE status = 'pending';

-- ============= Learning =============
CREATE TABLE content_performance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid NOT NULL REFERENCES promotion_posts(id) ON DELETE CASCADE,
  measured_at     timestamptz NOT NULL,
  hours_since_publish int NOT NULL,
  impressions     int DEFAULT 0,
  likes           int DEFAULT 0,
  replies         int DEFAULT 0,
  shares          int DEFAULT 0,
  saves           int DEFAULT 0,
  link_clicks     int DEFAULT 0,
  profile_visits  int DEFAULT 0,
  watch_time_sec  numeric,
  completion_rate numeric,
  engagement_rate numeric,
  raw_data        jsonb
);
CREATE INDEX idx_perf_post_time ON content_performance(post_id, hours_since_publish);

CREATE TABLE learning_insights (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pattern_type    text NOT NULL,
  finding         text NOT NULL,
  confidence      numeric NOT NULL,
  sample_size     int NOT NULL,
  recommendation  text,
  applies_to      text[] DEFAULT '{}',
  is_applied      boolean DEFAULT false,
  applied_at      timestamptz,
  generated_at    timestamptz NOT NULL DEFAULT now()
);
```

모든 신규 테이블에 RLS 정책 적용 (기존 패턴 그대로).

---

## 5. 신규 외부 통합

### 5.1 SNS 플랫폼 추가

| 플랫폼 | 주요 엔드포인트 | 한도 | 비용 | 우선순위 |
|---|---|---|---|---|
| Instagram Graph API | `/{ig-user-id}/media` (container) + `/media_publish` | 100 posts/24h | 무료 | P0 |
| YouTube Data API v3 | `videos.insert` (resumable) | 10 영상/24h (채널 한도) | 무료 (10k 쿼터/일) | P0 |
| TikTok Content Posting API | `/v2/post/publish/video/init/` | 미공개 | 무료 | P1 |
| LinkedIn Marketing API | `ugcPosts` + asset upload | 미공개 | 무료 | P2 |
| Bluesky AT Protocol | `com.atproto.repo.createRecord` | 미공개 | 무료 | P3 |
| Mastodon API | `/api/v1/statuses` | 인스턴스별 | 무료 | P3 |

각 통합 파일은 기존 `backend/app/integrations/` 패턴 그대로:
- `instagram_api.py`, `youtube_api.py`, `tiktok_api.py`, `linkedin_api.py`, `bluesky_api.py`, `mastodon_api.py`
- OAuth → `accounts.py` 라우트에 callback 핸들러 추가
- `_do_publish()` (현재 promotion.py:474) 함수 확장

### 5.2 AI 모델 통합

| 서비스 | 용도 | API | 통합 파일 (신규) |
|---|---|---|---|
| fal.ai | 영상 (Kling/Veo/Sora) | REST + Webhook | `fal_ai.py` |
| ElevenLabs | TTS, voice clone | REST | `elevenlabs.py` |
| OpenAI | Embeddings, Whisper, Moderation | REST | `openai_api.py` |
| Anthropic | Claude Sonnet 4.6 | REST | `claude_api.py` |
| BFL Flux | 이미지 (브랜드) | REST | `flux_api.py` (fal.ai 경유) |

### 5.3 인프라

- **Cloudflare R2** (영상 저장, zero egress)
- **Upstash Redis** (Celery broker + 캐시 + rate limit counter)
- **Celery** (영상 큐 — 5분+ 작업)
- **Slack API** (승인 알림)
- **OneSignal** (모바일 푸시)
- **Resend** (이메일)
- **Stripe** (결제)

---

## 6. LangGraph 마이그레이션 (구체)

서브 에이전트 리서치 결과 통합:

### 6.1 코드 구조 변경

```
backend/app/agents/
  core.py                        # 기존 유지 (레거시 fallback)
  context.py                     # 기존 유지 (state.context에 임베드)
  graph.py                       # 신규 — StateGraph 빌드
  graph_state.py                 # 신규 — AMPState TypedDict
  llm_router.py                  # 신규 — Tier 1/2/3 라우팅
  nodes/                         # 신규 — 각 노드 함수
    strategy.py
    content.py
    engagement.py
    asset_gen.py
    risk_guard.py
    publish.py
    performance.py
    human_gate.py
  tools/                         # 기존 유지 (등록 메커니즘 재사용)
  prompts/                       # 신규 — 노드별 별도 system prompt
```

### 6.2 Postgres Checkpointer

```python
# backend/app/agents/checkpointer.py
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from app.core.config import settings

_checkpointer: AsyncPostgresSaver | None = None

async def get_checkpointer() -> AsyncPostgresSaver:
    global _checkpointer
    if _checkpointer is None:
        _checkpointer = await AsyncPostgresSaver.from_conn_string(
            settings.supabase_db_url
        )
        # setup()은 별도 마이그레이션으로 1회만 실행
    return _checkpointer
```

`setup()`은 Railway 컨테이너가 race condition을 일으키므로 **마이그레이션 SQL로 분리** — `008_langgraph_checkpoint.sql`.

### 6.3 LLM Router

```python
# backend/app/agents/llm_router.py
from enum import Enum

class Tier(Enum):
    FLASH = "gemini-2.5-flash"          # $0.075/M input
    MINI = "gpt-4.1-mini"                # $0.15/M input
    SONNET = "claude-sonnet-4-6"        # $3/M input

TASK_MAP = {
    ("strategy", "low"): Tier.FLASH,
    ("strategy", "high"): Tier.MINI,
    ("content", "low"): Tier.MINI,
    ("content", "high"): Tier.SONNET,    # 사용자 voice 매칭 = 품질 최우선
    ("engagement_classify", "any"): Tier.FLASH,
    ("engagement_reply", "low"): Tier.MINI,
    ("engagement_reply", "high"): Tier.SONNET,
    ("risk_moderation", "any"): None,    # OpenAI Moderation (LLM 아님)
    ("video_script", "any"): Tier.SONNET,
    ("performance_pattern", "any"): Tier.FLASH,
}

FALLBACK_CHAIN = {
    Tier.SONNET: [Tier.MINI, Tier.FLASH],
    Tier.MINI: [Tier.FLASH],
    Tier.FLASH: [],
}

def route_llm(task: str, complexity: str = "low"):
    tier = TASK_MAP.get((task, complexity)) or TASK_MAP.get((task, "any")) or Tier.FLASH
    return build_llm(tier)
```

### 6.4 Migration Coexistence

- `projects.agent_backend` 컬럼으로 per-project 토글 (`legacy` / `langgraph` / `shadow`)
- `shadow` 모드: 레거시 결과를 사용자에게 노출, LangGraph 결과는 DB에만 기록 → 2주 비교 후 승급
- 신규 기능(영상 파이프라인, 멀티 채널)은 LangGraph 전용

### 6.5 LangSmith → Self-Hosted 전환

- 첫 60일: LangSmith Plus ($39/mo) — 노드 디버깅 필수
- 60일 후: `graph.astream(..., stream_mode="updates")`로 자체 `agent_execution_log` 테이블 기록 → Grafana 대시보드

---

## 7. 영상 파이프라인 (구체)

서브 에이전트 리서치 결과 통합:

### 7.1 흐름

```
[Script] → Sonnet 4.6로 6 scene × 5초 분할
[Queue] → Celery 위임 (5+ 분 작업 → main API 막지 않음)
[Scenes] → fal.ai Kling 3.0 6개 병렬 submit + webhook
[Audio] → ElevenLabs Turbo v2.5 ($0.18 / 30초 narration)
[Caption] → Whisper verbose_json + 자체 wrap (한국어 보정)
[Compose] → ffmpeg xfade + amix + subtitles burn-in (1080×1920 H.264)
[QC] → CLIP score + 정지 프레임 + Laplacian blur 3 병렬
[Storage] → Cloudflare R2 (zero egress)
[Approval] → Human Gate (interrupt) — 영상 미리보기
[Publish] → YT Shorts + IG Reels + TikTok 병렬 upload
```

### 7.2 fal.ai 호출 (Kling 3.0)

```python
# backend/app/integrations/fal_ai.py
import httpx
from app.core.config import settings

FAL_BASE = "https://queue.fal.run/fal-ai"

async def submit_kling_video(prompt: str, webhook_url: str, duration: int = 5) -> str:
    """Returns request_id immediately; result arrives via webhook."""
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(
            f"{FAL_BASE}/kling-video/v2.1/standard/text-to-video",
            headers={"Authorization": f"Key {settings.fal_api_key}"},
            json={
                "prompt": prompt,
                "duration": str(duration),
                "aspect_ratio": "9:16",
                "webhook_url": webhook_url,
            },
        )
        r.raise_for_status()
        return r.json()["request_id"]

async def submit_veo_video(prompt: str, webhook_url: str, duration: int = 5) -> str:
    """Premium tier — 4K + native audio."""
    # 동일 패턴, endpoint만 다름: /veo/v3.1/text-to-video
    ...
```

### 7.3 ElevenLabs TTS

```python
# backend/app/integrations/elevenlabs.py
import httpx
from app.core.config import settings

ELEVEN_BASE = "https://api.elevenlabs.io/v1"

async def text_to_speech(text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM") -> bytes:
    """Returns MP3 bytes. Use Turbo v2.5 for speed."""
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(
            f"{ELEVEN_BASE}/text-to-speech/{voice_id}",
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "model_id": "eleven_turbo_v2_5",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                "output_format": "mp3_44100_128",
            },
        )
        r.raise_for_status()
        return r.content
```

### 7.4 Whisper 자막

```python
# backend/app/services/captioning.py
import openai
import textwrap
from app.core.config import settings

async def generate_captions(audio_path: str) -> str:
    """Returns SRT string with word-level timing."""
    client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
    with open(audio_path, "rb") as f:
        result = await client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["word"],
        )
    return _words_to_srt(result.words, max_chars=14)


def _words_to_srt(words: list[dict], max_chars: int = 14) -> str:
    """Group words into 2-3 word chunks for Shorts."""
    chunks, current, current_start = [], [], None
    for w in words:
        if current_start is None:
            current_start = w["start"]
        candidate = " ".join(current + [w["word"]])
        if len(candidate) > max_chars and current:
            chunks.append((current_start, w["start"], " ".join(current)))
            current, current_start = [w["word"]], w["start"]
        else:
            current.append(w["word"])
    if current:
        chunks.append((current_start, words[-1]["end"], " ".join(current)))

    srt = []
    for i, (start, end, text) in enumerate(chunks, 1):
        srt.append(f"{i}\n{_fmt(start)} --> {_fmt(end)}\n{text}\n")
    return "\n".join(srt)


def _fmt(s: float) -> str:
    h, rem = divmod(int(s), 3600)
    m, sec = divmod(rem, 60)
    ms = int((s - int(s)) * 1000)
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"
```

**한국어 wrap 주의**: Whisper가 띄어쓰기 없이 출력할 때가 있음. 14-16자 강제 wrap + 조사 단위 분할 (`은/는/이/가/을/를` 뒤에 끊기).

### 7.5 ffmpeg 합성

```bash
ffmpeg \
  -i scene1.mp4 -i scene2.mp4 -i scene3.mp4 \
  -i scene4.mp4 -i scene5.mp4 -i scene6.mp4 \
  -i narration.mp3 -i bgm.mp3 \
  -filter_complex "
    [0:v][1:v]xfade=transition=fade:duration=0.3:offset=4.7[v01];
    [v01][2:v]xfade=transition=fade:duration=0.3:offset=9.7[v02];
    [v02][3:v]xfade=transition=fade:duration=0.3:offset=14.7[v03];
    [v03][4:v]xfade=transition=fade:duration=0.3:offset=19.7[v04];
    [v04][5:v]xfade=transition=fade:duration=0.3:offset=24.7[v];
    [6:a]volume=1.0[a1];[7:a]volume=0.15[a2];
    [a1][a2]amix=inputs=2[a];
    [v]subtitles=captions.srt:force_style='Fontname=Pretendard,Fontsize=18,Outline=2,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&'[vo]
  " \
  -map "[vo]" -map "[a]" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
  -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  output.mp4
```

**핵심 포인트**:
- `+faststart` 필수 (플랫폼이 fast ingest)
- subtitle은 **burn-in** (sidecar SRT는 IG/TikTok이 제거)
- BGM은 `-18dB`로 깔기 (narration 위에)
- 9:16 1080×1920 (Shorts/Reels/TikTok 공통)

### 7.6 Quality Gate

```python
# backend/app/services/video_qc.py
import open_clip
import cv2
import numpy as np
import torch

_clip_model = None
_clip_preprocess = None

def _load_clip():
    global _clip_model, _clip_preprocess
    if _clip_model is None:
        _clip_model, _, _clip_preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32", pretrained="openai"
        )
    return _clip_model, _clip_preprocess


def clip_score(prompt: str, frame_paths: list[str]) -> float:
    model, preprocess = _load_clip()
    text = open_clip.tokenize([prompt])
    text_features = model.encode_text(text)
    scores = []
    for fp in frame_paths:
        img = preprocess(load_image(fp)).unsqueeze(0)
        img_features = model.encode_image(img)
        score = torch.cosine_similarity(text_features, img_features).item()
        scores.append(score)
    return np.mean(scores)


def stuck_frame_check(video_path: str, threshold: float = 2.0) -> bool:
    """True if 3+ consecutive frames are nearly identical."""
    cap = cv2.VideoCapture(video_path)
    prev = None
    stuck = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if prev is not None:
            diff = np.mean(np.abs(gray.astype(int) - prev.astype(int)))
            if diff < threshold:
                stuck += 1
                if stuck >= 3:
                    return True
            else:
                stuck = 0
        prev = gray
    return False


def blur_score(frame_path: str) -> float:
    img = cv2.imread(frame_path, cv2.IMREAD_GRAYSCALE)
    return cv2.Laplacian(img, cv2.CV_64F).var()


def quality_decision(prompt: str, video_path: str) -> dict:
    frames = sample_frames(video_path, n=3)
    return {
        "clip": clip_score(prompt, frames),       # < 0.22 → regen
        "stuck": stuck_frame_check(video_path),   # True → regen
        "blur": min(blur_score(f) for f in frames),  # < 100 → regen
    }
```

**의사결정**: 단일 실패 → auto regen 1회. 2회 연속 또는 2+ 동시 실패 → human review queue.

### 7.7 비용 모델 (30초 영상)

| 구성요소 | Kling 3.0 | Veo 3.1 |
|---|---|---|
| 영상 생성 (30s) | $3.00 | $15.00 |
| ElevenLabs TTS (~600자) | $0.18 | $0.18 |
| Whisper 자막 | $0.003 | $0.003 |
| Gemini script + CLIP gate | ~$0.02 | ~$0.02 |
| R2 storage + egress | <$0.01 | <$0.01 |
| **합계** | **~$3.21** | **~$15.21** |

Veo는 hero launch만, default는 Kling.

---

## 8. 페르소나 & Voice 학습

### 8.1 3단계 학습

**Stage 1: 초기 페르소나** (즉시, 무료)
- 사용자가 X/Threads 연결 후 → 과거 글 100개 import → `voice_samples`에 저장 + embedding
- LLM(Sonnet) 호출 1회로 voice_profile 추출:
  - 평균 문장 길이, 이모지 빈도, 의문형 비율, 1인칭 빈도
  - 자주 쓰는 시작 문구, 의견/입장
  - "AI 티 나는" forbidden phrases

**Stage 2: RAG 매칭** (default, Starter+)
- 새 콘텐츠 생성 시 pgvector로:
  - 가장 비슷한 user sample 5개 (의미 유사도)
  - 가장 잘 된 user sample 10개 (engagement_score 기준)
- 이걸 Content node 프롬프트에 주입

**Stage 3: Fine-Tuning** (Pro+, opt-in)
- 50+ samples & 사용자 동의 시
- OpenAI Fine-Tuning API (`gpt-4.1-mini`)
- 학습 비용 $25 + 사용 $0.30/M tokens
- `personas.ft_model_id` 저장 → Content node가 우선 사용

### 8.2 페르소나 UI

`/projects/[id]/persona`:
1. **Import 단계** — X/Threads 연결 후 자동 50-100개 fetch
2. **Voice Analysis** — LLM 추출 결과 사용자 확인 (체크박스로 의견 corpus 편집)
3. **Forbidden Phrases** — AI가 발견한 "AI 패턴" 사용자 검토 + 추가
4. **Test Generation** — 사용자가 주제 입력 → AI가 voice 매칭 3 variants → "이게 나 같아?" 피드백

---

## 9. 휴먼-라이크 행동 모델

### 9.1 시간 분포 (단순 cron 아님)

```python
# backend/app/services/human_pattern.py
import random
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

CHANNEL_GOLDEN_HOURS = {
    "x": {9: 1.0, 12: 1.5, 14: 1.3, 18: 1.8, 21: 1.6},
    "threads": {8: 1.2, 12: 1.0, 17: 1.5, 20: 1.8, 22: 1.4},
    "instagram": {11: 1.5, 14: 1.0, 17: 1.3, 20: 1.8},
    "youtube": {15: 1.0, 18: 1.5, 20: 1.8, 21: 1.6},
}

def generate_publish_schedule(
    n_posts: int,
    date_local: date,
    user_tz: str,
    channel: str,
    user_active_hours: list[int],
) -> list[datetime]:
    golden = CHANNEL_GOLDEN_HOURS.get(channel, {h: 1.0 for h in range(24)})
    weighted = []
    for h in user_active_hours:
        weight = golden.get(h, 0.5)
        weighted.extend([h] * int(weight * 10))
    selected = random.sample(weighted, min(n_posts, len(set(weighted))))
    times = []
    for h in selected:
        minute = random.randint(0, 59)
        noise = random.gauss(0, 15)
        t = datetime.combine(date_local, time(h, minute)) + timedelta(minutes=noise)
        times.append(t.replace(tzinfo=ZoneInfo(user_tz)))
    return sorted(times)
```

### 9.2 답글 응답 지연

```python
def calculate_reply_delay(
    classification: str,
    user_tz: str,
    user_typical_response_minutes: int,
) -> timedelta:
    now = datetime.now(ZoneInfo(user_tz))

    # 자는 시간 → 다음날 아침
    if now.hour < 7 or now.hour > 23:
        next_morning = now.replace(
            hour=8, minute=random.randint(0, 60), second=0
        ) + timedelta(days=1 if now.hour > 23 else 0)
        return next_morning - now

    # 점심 시간 → 30-90분 후
    if 12 <= now.hour <= 13:
        return timedelta(minutes=random.randint(30, 90))

    # 평시 → 사용자 평균에 가까운 분포
    mean = user_typical_response_minutes
    delay = max(2, random.gauss(mean, mean * 0.5))
    if classification == "high_priority":
        delay = min(delay, 15)
    return timedelta(minutes=delay)
```

### 9.3 모든 멘션 응답 안 함

```python
def should_respond(classification: str, sender_followers: int) -> bool:
    rates = {
        "spam": 0.0,
        "praise": 0.60,
        "question": 0.95,
        "criticism": 1.0,  # 항상 (휴먼 확인)
        "opportunity": 1.0,
        "other": 0.50,
    }
    base = rates.get(classification, 0.50)
    if sender_followers > 10_000:
        base = min(1.0, base + 0.2)
    return random.random() < base
```

### 9.4 콘텐츠 다양성

pgvector로 최근 7일 발행 글 임베딩과 cosine similarity > 0.80이면 거부. 같은 format(`format` 컬럼) 5개 연속이면 거부.

---

## 10. 5단계 Safety Layer

### 10.1 Guard 1: Content Moderation

OpenAI Moderation API (무료) + Google Perspective API (toxicity).
- toxicity > 0.7 → BLOCK
- 정치 / 의료 / 법률 카테고리 → WARN (human review)

### 10.2 Guard 2: 중복 방지

```python
async def check_duplicate(new_embedding: list[float], project_id: str) -> RiskCheckResult:
    similar = await supabase.rpc("match_recent_posts", {
        "query_embedding": new_embedding,
        "project_id": project_id,
        "days": 30,
        "match_threshold": 0.85,
    })
    if similar.data:
        return RiskCheckResult(severity="block", reason=f"Too similar to {similar.data[0]['id']}")
    return RiskCheckResult(severity="ok")
```

### 10.3 Guard 3: Rate Limit Tracker

기존 `slowapi` 확장. `rate_limit_tracker` 테이블에 플랫폼별 현재 사용량 실시간 추적.

```python
RATE_LIMITS = {
    ("threads", "post.create"): (250, "24h"),
    ("threads", "reply.create"): (1000, "24h"),
    ("instagram", "media.publish"): (100, "24h"),
    ("youtube", "videos.insert"): (10, "24h"),  # 채널 한도
    ("x", "tweets.create"): (10000, "24h"),
}
```

80% 도달 → 알림. 95% 도달 → 새 발행 차단.

### 10.4 Guard 4: Cost Governor

```python
async def check_cost(project_id: str, estimated_cost: float) -> RiskCheckResult:
    project = await fetch_project(project_id)
    daily = await sum_today_cost(project_id)
    monthly = await sum_month_cost(project_id)

    if daily + estimated_cost > project.daily_post_budget:
        return RiskCheckResult(severity="block", reason="Daily budget exceeded")
    if monthly + estimated_cost > project.monthly_cost_budget_usd:
        return RiskCheckResult(severity="block", reason="Monthly budget exceeded")
    if monthly + estimated_cost > project.monthly_cost_budget_usd * 0.8:
        return RiskCheckResult(severity="warn", reason="Monthly budget 80%+")
    return RiskCheckResult(severity="ok")
```

영상 생성 전: estimated_cost 계산 → 초과 시 더 저렴한 모델(Kling)로 자동 다운그레이드.

### 10.5 Guard 5: Shadowban Detector

매일 자정 (UTC):
```python
async def shadowban_check_all():
    for project in active_projects:
        recent = await avg_impressions(project.id, days=3, channel="x")
        baseline = await avg_impressions(project.id, days=30, channel="x")
        ratio = recent / max(baseline, 1)

        if ratio < 0.3:
            consecutive = await update_consecutive_suspicious(project.id, +1)
            if consecutive >= 3:
                await pause_publishing(project.id, hours=48)
                await alert_user(project.id, "Shadowban suspected, paused 48h")
```

### 10.6 Kill Switch

- 5분 내 동일 콘텐츠 3회 발행 (루프 의심) → 자동 활성화
- 1시간 내 API 에러율 50%+ → 자동 활성화
- Moderation violation 3회 연속 → 자동 활성화
- 사용자 "긴급 정지" 버튼 (대시보드 상단)

활성화 시: 모든 워크플로우 일시정지, 자동화 룰 비활성화, 사용자 알림.

---

## 11. UI 변경 (델타)

### 11.1 추가될 페이지

| 경로 | 신규/확장 | 용도 |
|---|---|---|
| `/projects/[id]/agents` | 신규 | 6개 에이전트 실시간 상태 + 로그 |
| `/projects/[id]/queue` | 신규 | 승인 대기열 (모바일 친화) |
| `/projects/[id]/videos` | 신규 | 영상 프로젝트 라이브러리 + 에디터 |
| `/projects/[id]/videos/new` | 신규 | 영상 생성 위저드 |
| `/projects/[id]/persona` | 신규 | 페르소나/voice 설정 |
| `/projects/[id]/automations` | 신규 | No-code 자동화 룰 빌더 |
| `/projects/[id]/interactions` | 신규 | 멘션/답글/DM 인박스 |
| `/projects/[id]/cost` | 신규 | 비용 추적 + 예산 설정 |
| `/projects/[id]/settings` | 확장 | autonomy_level 토글, 채널 추가 |
| `/billing` | 신규 | 구독 + 결제 |

### 11.2 기존 페이지 변경

**대시보드** (`/projects/[id]`):
- "Agent Status" 위젯 추가 (6개 에이전트 라이브 상태)
- "Approval Queue" 카드 (대기 건수)
- 비용 추적 위젯 (일일 사용량)

**프로모션 캘린더** (`/projects/[id]/promotion`):
- 영상 콘텐츠 표시 (썸네일 chip)
- AI 자동 발행 vs 사용자 작성 구분 아이콘
- 페르소나 voice_match_score 표시

**인사이트** (`/projects/[id]/insights`):
- "Learning Insights" 섹션 추가 (적용 가능 인사이트 + 1-click apply)
- A/B 테스트 결과 비교 뷰

### 11.3 Approval Queue UX

- **모바일 우선**: 좌/우 스와이프로 승인/거절
- **Slack 통합** (Pro): 메시지에 [Approve] [Reject] [Edit] 버튼
- **푸시 알림**: OneSignal
- **만료**: 24h 응답 없으면 자동 만료 (또는 사용자 설정대로 자동 발행)

---

## 12. API 엔드포인트 (델타)

### 12.1 신규 라우트

```
# Persona
GET    /api/projects/{id}/persona
PATCH  /api/projects/{id}/persona
POST   /api/projects/{id}/persona/import-voice  (body: {platform, count})
POST   /api/projects/{id}/persona/test-generation
POST   /api/projects/{id}/persona/start-fine-tuning

# Media Assets
GET    /api/projects/{id}/assets
POST   /api/projects/{id}/assets/generate-image
DELETE /api/projects/{id}/assets/{asset_id}

# Videos
GET    /api/projects/{id}/videos
POST   /api/projects/{id}/videos  (body: {script_prompt, type, model})
GET    /api/projects/{id}/videos/{video_id}
POST   /api/projects/{id}/videos/{video_id}/publish

# Interactions
GET    /api/projects/{id}/interactions?status=pending
PATCH  /api/projects/{id}/interactions/{id}  (body: {draft_reply, action})
POST   /api/projects/{id}/interactions/{id}/send

# Automations
GET    /api/projects/{id}/automations
POST   /api/projects/{id}/automations
PATCH  /api/projects/{id}/automations/{rule_id}
DELETE /api/projects/{id}/automations/{rule_id}
POST   /api/projects/{id}/automations/{rule_id}/test

# Approvals
GET    /api/approvals?status=pending
POST   /api/approvals/{id}/decide  (body: {decision, edited_content?})

# Workflows
GET    /api/projects/{id}/workflows/runs
GET    /api/projects/{id}/workflows/runs/{run_id}
POST   /api/projects/{id}/workflows/runs/{run_id}/resume

# Cost
GET    /api/projects/{id}/cost/summary
GET    /api/projects/{id}/cost/ledger
PATCH  /api/projects/{id}/budget

# Kill Switch
POST   /api/projects/{id}/emergency-stop
POST   /api/projects/{id}/resume

# Insights (확장)
GET    /api/projects/{id}/insights/learning  (신규)
POST   /api/projects/{id}/insights/learning/{insight_id}/apply

# Webhooks (신규)
POST   /api/webhooks/instagram
POST   /api/webhooks/youtube
POST   /api/webhooks/tiktok
POST   /api/webhooks/fal  (영상 생성 완료 콜백)
```

### 12.2 기존 라우트 확장

```
PATCH /api/projects/{id}/promotion/posts/{post_id}
  + workflow_run_id (LangGraph 연결)
  + voice_match_score (페르소나 점수)
  + 자동 임베딩 갱신

POST /api/projects/{id}/agent/run
  + backend 파라미터 ('legacy' | 'langgraph')
  + graph_name ('content_creation' | 'engagement' | 'video_production')
```

---

## 13. 비용 모델 (사용자 페이 + 운영 비용)

### 13.1 사용자 플랜

| 플랜 | 가격 | 프로젝트 | 일 콘텐츠 | 영상/월 | 채널 | AI 답글 | 자율성 max |
|---|---|---|---|---|---|---|---|
| **Free** | **$0 (영구)** | 1 | 3 (텍스트만) | 0 | 2 (X+Threads) | X (수동만) | L0/L1 |
| Starter | $29/mo | 1 | 10 | 3 (Kling) | 5 | 승인 필수 | L2 |
| **Pro** | **$99/mo** | 3 | 25 | 15 (Kling) | 모든 | 자율 옵션 (Threads/IG/YT) | L3 |
| Agency | $299/mo | 무제한 | 100 | 50 (Kling+Veo) | 모든 | 자율 + 팀 협업 | L3 + 팀 |
| Enterprise | custom | 무제한 | 무제한 | 무제한 | 모든 | + 자체 호스팅 | L3 + SSO |

**모든 플랜 공통 (사용자 권한)**: 자율성 레벨과 무관하게 콘텐츠 직접 업로드/편집/삭제, 자동화 일시정지, Kill Switch 항상 사용 가능 (§부록 B.3 참조).

**Free 플랜 정책 (영구 무료)**:
- 워터마크 자동 추가 (작은 텍스트 "via LaunchPad")
- LLM은 Gemini 2.5 Flash만 (Claude/GPT 차단)
- 마켓 인사이트 주 1회 (Pro는 매일)
- 페르소나 학습 RAG only (Fine-tune X)
- 우선순위 큐 제일 아래 (peak time 지연 가능)
- 이메일 verify 필수 + 첫 24h 발행 1개 cap (스팸 방지)
- 우리 비용: ~$0.50/사용자/mo
- 무료 → Pro 전환율 가정 5% → 1000 free 사용자 = $1,650/mo 수익

**BYOK 모드** (유료 플랜 선택): 사용자가 자체 fal/ElevenLabs/OpenAI 키 입력 → 영상/오디오/AI 비용은 사용자 부담 → 플랜 가격 **30% 할인**.

### 13.2 우리 운영 비용 (Pro 사용자 평균)

| 항목 | 비용 |
|---|---|
| LLM (Gemini 75%, Mini 20%, Sonnet 5%) | $8/mo |
| 영상 (Kling 30s × 15) | $45/mo |
| TTS (ElevenLabs Turbo) | $5/mo |
| X API (사용자 키 통해) | $0 |
| 인프라 분담 (Supabase + R2 + Railway + Vercel) | $7/mo |
| LangSmith (60일 후 self-host) | $1/mo |
| **총** | **$66/mo** |

Pro $99 → 마진 $33/mo (33%). BYOK 사용자는 마진 $20/mo (영상비 제외).

### 13.3 인프라 고정비

| 항목 | 비용 |
|---|---|
| Supabase Pro | $25/mo |
| Railway (api×3 + worker + scheduler + streamer) | $80/mo |
| Vercel Pro | $20/mo |
| Cloudflare R2 (Storage 100GB) | $1.50/mo |
| Upstash Redis | $20/mo |
| Sentry Team | $26/mo |
| PostHog Cloud (1M events) | $0 (무료) |
| Resend (5k emails) | $20/mo |
| OneSignal | $0 (무료) |
| 도메인/SSL | $15/yr |
| **합계** | **~$192/mo** |

손익분기: Pro 사용자 6명 + 인프라 0% growth면 $396 매출 - $192 인프라 = $204 마진.

---

## 14. 컴플라이언스 & 법무

### 14.1 플랫폼 ToS 준수 (반드시)

| 플랫폼 | 금지 | LaunchPad 강제 정책 |
|---|---|---|
| X | 자동 답글/팔로우/좋아요 | UI에서 자동 답글 토글 자체 제거 |
| Instagram | 100 posts/24h 초과 | rate_limit_tracker 95% 차단 |
| YouTube | 일 10 영상/채널 초과 | 동일 |
| TikTok | 비공식 음원 (저작권) | Suno 또는 royalty-free만 |
| 모든 곳 | CSAM, 폭력, 혐오 | OpenAI Moderation 모든 발행 전 검사 |

### 14.2 GDPR / 개인정보

- 사용자 데이터 삭제: `DELETE /api/account` → 30일 내 완전 삭제
- 데이터 export: ZIP 다운로드 (voice samples, posts, persona)
- 동의 옵트인: ML 학습 사용 동의 별도
- DPA 문서: 엔터프라이즈용

### 14.3 저작권

- AI 생성 콘텐츠 소유: 사용자
- 배경음악: Suno 생성 또는 YouTube Audio Library
- 사용자 업로드 이미지: 사용자 권리 책임

### 14.4 콘텐츠 책임

- 사용자가 AI 콘텐츠 최종 책임 (약관 명시)
- LaunchPad는 도구 제공자 (safe harbor)
- 명예훼손/허위정보 자동 감지 → 차단

---

## 15. 리스크 레지스터

| 리스크 | 영향 | 확률 | 완화 |
|---|---|---|---|
| X 정책 변경 → 모든 자동화 금지 | 매우 큼 | 중 | Threads/IG/YT 다변화 (현재 X 비중 25%로 제한) |
| AI 영상 비용 폭등 | 큼 | 중 | BYOK 모델, 모델 자동 다운그레이드, 일일 cap |
| 사용자 계정 shadowban | 중 | 중 | shadowban 모니터, 자동 휴식 (48h) |
| 저작권 분쟁 | 중 | 낮 | 약관 명시, 자동 음원 검사 |
| 데이터 유출 | 매우 큼 | 낮 | RLS + Fernet + 분기 감사 |
| 큰 경쟁사 진입 (Buffer + AI) | 큼 | 높 | 개발자 워크플로우 통합 + 영상 자동화로 차별화 |
| OpenAI/Google API 다운 | 중 | 중 | 멀티 프로바이더 + fallback chain |
| LangGraph breaking change | 중 | 낮 | 추상화 layer + LTS 버전 고정 |
| 영상 품질 불만 | 중 | 중 | QC gate + 사용자 모델 선택권 |
| Voice 학습 부정확 → 사용자 voice 안 닮음 | 중 | 중 | 점진적 학습 + 사용자 피드백 루프 + opt-in fine-tune |

---

## 16. 관측성 (Observability)

### 16.1 로깅

- 구조화 JSON 로그 (Loki)
- 필드: `timestamp, level, service, trace_id, project_id, event, model, duration_ms, cost_usd`
- 모든 노드 transition 로깅 (`agent_execution_log` 테이블)

### 16.2 메트릭 (Prometheus)

- `content_drafts_total{project, channel, status}`
- `agent_execution_duration_seconds{agent_name}`
- `external_api_requests_total{service, endpoint, status}`
- `cost_usd_total{project, service}`
- `approval_queue_size{project}`
- `shadowban_risk_score{project, platform}`
- `video_generation_duration_seconds{model}`
- `voice_match_score_histogram{project}`

### 16.3 트레이싱

- LangSmith 60일 사용 후 자체 OTLP → Grafana Tempo

### 16.4 알람

**Critical**:
- DB 연결 실패
- API 에러율 > 5% (5분)
- LangGraph 워크플로우 실패율 > 20%
- 비용 일일 한도 95% 도달

**Warning**:
- 큐 사이즈 > 100
- 영상 평균 시간 > 10분
- Shadowban 의심 (단일 프로젝트)

---

## 17. 인프라 & 배포

### 17.1 환경

| 환경 | 인프라 |
|---|---|
| Local | Docker Compose (Postgres + Redis + Minio + Mailhog) |
| Preview (PR별) | Vercel Preview + Railway preview env |
| Staging | 별도 Railway 프로젝트, prod와 동일 스키마 |
| Production | Railway (다중 서비스) + Vercel + Supabase + R2 |

### 17.2 서비스 분리 (Railway)

| 서비스 | 인스턴스 | 용도 |
|---|---|---|
| `api` | 3 replicas | FastAPI HTTP |
| `worker-general` | 2 replicas | Celery 일반 잡 |
| `worker-video` | 1 replica (autoscale to 4) | 영상 생성 큐 |
| `scheduler` | 1 singleton | APScheduler |
| `streamer-x` | 1 singleton | X Filtered Stream |
| `streamer-engagement` | 1 singleton | Threads/IG/YT polling |

### 17.3 CI/CD

- GitHub Actions
- main 머지 → 자동 prod 배포
- PR → preview env + 통합 테스트
- 마이그레이션: `supabase db push` (preview), 수동 승인 (prod)

---

## 18. 마이그레이션 플랜 (시간순)

기존 동작 안 깨뜨리는 **shadow + feature flag** 방식.

### 18.1 Wave 1: Foundation (Week 1-2)

기존 기능 영향 없이 추가:
- pgvector extension 활성화
- Migration `008_amp_extensions.sql` 적용
- `langgraph` Python 의존성 추가
- Cloudflare R2 셋업
- Upstash Redis 추가
- Celery worker 추가
- Sentry + PostHog 도입
- 모든 신규 통합 파일 작성 (IG, YT, fal, ElevenLabs, OpenAI Embeddings, Whisper)

### 18.2 Wave 2: Agent Migration (Week 2-3)

기존 agent와 병행:
- LangGraph StateGraph 구축 (`graph.py`, `nodes/*.py`)
- LLM Router 구현
- Postgres checkpointer
- 6개 노드 작성 + skill 매핑
- `projects.agent_backend = 'shadow'` 토글
- 1개 프로젝트 (테스트용) shadow mode 시작

### 18.3 Wave 3: Safety Layer (Week 3)

가드 없으면 자율 못 함:
- Risk Guard 5단계 구현
- Rate limit tracker
- Cost ledger + governor
- Shadowban monitor
- Kill switch

### 18.4 Wave 4: New Channels (Week 3-4)

- Instagram Graph API → OAuth + 발행
- YouTube Data API v3 → OAuth + 업로드
- TikTok / LinkedIn (P1)
- 채널별 content skill 작성

### 18.5 Wave 5: Video Pipeline (Week 4-5)

- fal.ai 통합 + Kling 3.0 첫 영상
- ElevenLabs + Whisper
- ffmpeg composition
- Quality gate (CLIP + blur + stuck)
- Video Studio UI (`/videos`)

### 18.6 Wave 6: Engagement System (Week 5)

- X Filtered Stream connection
- Threads/IG/YT polling
- Engagement Agent
- Approval Queue UI + Slack integration
- 휴먼-라이크 지연

### 18.7 Wave 7: Persona & Learning (Week 5-6)

- Voice samples import
- Persona builder
- Stage 1 RAG 통합
- Performance Agent 1h/6h/24h/7d 메트릭
- Weekly pattern discovery
- A/B testing

### 18.8 Wave 8: UI Polish (Week 6)

- Agent Console
- Automation Rule Builder
- Insights 확장 (Learning section)
- 모바일 최적화 (스와이프 승인)

### 18.9 Wave 9: Monetization (Week 6-7)

- Stripe 통합
- 플랜 페이지 + 결제 흐름
- 사용량 추적 + 한도 차단
- BYOK 키 관리

### 18.10 Wave 10: Launch Prep (Week 7-8)

- 약관 / Privacy / DPA
- 도큐먼트 사이트
- Landing 리뉴얼
- 자기 dogfood (LaunchPad가 LaunchPad 마케팅)
- ProductHunt 런칭

---

## 19. KPI

### 19.1 North Star

**"사용자가 일주일에 자동으로 발행한 콘텐츠 개수 (영상 포함)"**
목표: Pro 사용자 평균 25개/주

### 19.2 Product KPI (6개월)

| 지표 | 목표 |
|---|---|
| MAU | 500+ |
| 유료 전환율 | 12%+ |
| Pro 사용자 일 평균 자동 발행 | 7개+ |
| 사용자당 영상 (Pro) | 월 15+ |
| 콘텐츠 승인율 | 85%+ |
| 인사이트 적용율 | 60%+ |
| NPS | 50+ |
| Churn | < 5%/월 |
| "Sounds like me" 점수 | 8.0/10 (사용자 자가 평가) |

### 19.3 Operational KPI

| 지표 | 목표 |
|---|---|
| API 가용성 | 99.9% |
| 콘텐츠 생성 시간 (텍스트) | < 30초 |
| 영상 생성 시간 (Kling) | < 5분 |
| 자동화 실패율 | < 2% |
| 비용 마진 | 30%+ |

---

## 20. 코드 디렉토리 최종 구조

```
backend/app/
  main.py                            # 기존 + 신규 라우트 등록
  core/
    config.py, supabase.py, encryption.py, exceptions.py, rate_limit.py  # 기존
    llm_router.py                    # NEW
    cost_tracker.py                  # NEW
    kill_switch.py                   # NEW
  agents/
    core.py                          # 기존 (legacy fallback)
    context.py                       # 기존
    graph.py                         # NEW
    graph_state.py                   # NEW
    checkpointer.py                  # NEW
    llm_router.py                    # NEW
    nodes/                           # NEW
      strategy.py
      content.py
      engagement.py
      asset_gen.py
      risk_guard.py
      publish.py
      performance.py
      human_gate.py
    tools/                           # 기존 (전체 재사용)
    prompts/                         # NEW (노드별 system prompt)
  api/routes/
    # 기존 전부 유지 +
    persona.py
    assets.py
    videos.py
    interactions.py
    automations.py
    approvals.py
    cost.py
    workflows.py
    kill_switch.py
  integrations/
    # 기존 +
    instagram_api.py
    youtube_api.py
    tiktok_api.py
    linkedin_api.py
    bluesky_api.py
    mastodon_api.py
    fal_ai.py
    elevenlabs.py
    openai_api.py
    claude_api.py
    flux_api.py
    stripe_api.py
    slack_api.py
    cloudflare_r2.py
  services/
    # 기존 +
    persona_builder.py
    voice_matcher.py
    embedding_service.py
    content_dedup.py
    human_pattern.py
    cost_governor.py
    shadowban_monitor.py
    ab_testing.py
    video_pipeline.py
    video_qc.py
    captioning.py
    moderation.py
  workers/
    scheduler.py                     # 기존 + 신규 잡 등록
    celery_app.py                    # NEW
    tasks/
      # 기존 전부 유지 +
      engagement_monitor_x.py        # X Filtered Stream
      engagement_monitor_polling.py  # Threads/IG/YT
      content_perf_snapshot.py       # 1h/6h/24h/7d
      pattern_discovery.py           # 주간
      budget_check.py                # 매시간
      shadowban_check.py             # 매일
      approval_expiry.py             # 매시간
      weekly_video_generator.py      # 매주
    celery_tasks/                    # NEW (long-running)
      video_generation.py
      scene_generation.py
      composition.py
  workspace/                         # 기존 전부 유지
    default_skills/
      # 기존 8개 +
      strategy.md
      engagement.md
      asset_generation.md
      risk_guard.md
      content_x.md, content_threads.md, content_instagram.md,
      content_youtube.md, content_tiktok.md, content_linkedin.md

frontend/src/
  app/
    # 기존 전부 유지 +
    projects/[id]/
      agents/page.tsx
      queue/page.tsx
      videos/page.tsx
      videos/new/page.tsx
      videos/[videoId]/page.tsx
      persona/page.tsx
      automations/page.tsx
      interactions/page.tsx
      cost/page.tsx
    billing/page.tsx
  components/
    # 기존 +
    agents/AgentStatusCard.tsx, AgentConsole.tsx
    videos/VideoEditor.tsx, ScenePreview.tsx, VideoPlayer.tsx
    interactions/InteractionInbox.tsx, ReplyDraft.tsx
    approvals/ApprovalQueue.tsx, SwipeApprovalCard.tsx
    automations/RuleBuilder.tsx, TriggerSelector.tsx, ActionSelector.tsx
    persona/VoiceImporter.tsx, VoiceAnalyzer.tsx, SampleGenerator.tsx
  hooks/
    # 기존 +
    use-videos.ts
    use-interactions.ts
    use-automations.ts
    use-approvals.ts
    use-persona.ts
    use-cost.ts
    use-workflows.ts
  lib/api/
    # 기존 +
    videos.ts, persona.ts, interactions.ts,
    automations.ts, approvals.ts, cost.ts, workflows.ts
```

---

## 부록 A: 결정 의사록 (Decision Log)

이 기획서 작성 시 의사결정 근거 정리.

### A1. LangGraph vs CrewAI vs AutoGen
**선택**: LangGraph
**이유**: 2026년 production 점유율 1위, audit trail / rollback / human-in-the-loop 표준 기능, Postgres checkpointer 안정적. CrewAI는 prototype용 (5.76× 빠름 - QA task) 하지만 production 감사 기능 부족. AutoGen은 Microsoft 종속 + Python+TS 분기.

### A2. 영상 default = Kling 3.0
**이유**: Veo 3.1 대비 4.7× 저렴 ($3.21 vs $15.21). Pika는 빠르지만 일관성 부족. Sora 2는 $0.75/sec로 hero launch 전용. Kling은 multi-angle subject consistency가 우수해 일일 발행에 적정.

### A3. fal.ai 단일 게이트웨이
**이유**: 600+ 모델 단일 API. Kling/Veo/Sora/Pika/Runway 모두 통합. 모델 변경이 prompt 변경 수준. 직접 통합 시 5+ 별도 클라이언트 + 인증 + 폴링 구현 필요.

### A4. X 자율 답글 금지 (UI에서 토글 제거)
**이유**: 2026 X 정책 명시 — 자동 답글/좋아요/팔로우는 즉시 정지 사유. 사용자에게 "자동 답글" 옵션 제공 자체가 위험 (실수로 켤 가능성). 대신 "Draft + 1-click 승인"으로 사용자 효율 보전.

### A5. ElevenLabs Turbo v2.5
**이유**: 250ms 레이턴시 (영상용 적정), $0.30 → $0.15/1k chars (50% 저렴). 한국어는 multilingual_v2 (가격 동일) 필요. Voice clone은 Pro 플랜만.

### A6. Subtitle Burn-in vs Sidecar
**이유**: Instagram Reels / TikTok가 sidecar SRT 제거함. Burn-in 강제. YouTube만 sidecar 지원 → 양쪽 다 만들어 플랫폼별 선택.

### A7. Cloudflare R2 vs Supabase Storage
**이유**: R2는 egress 무료. 영상 50-300MB × 100 view → Supabase $2.70/영상 vs R2 $0. 1000 사용자 × 월 15 영상 = $40,500/mo 차이.

### A8. Per-Task Feature Flag (not per-project)
**이유**: 같은 프로젝트 내에서도 weekly_report는 LangGraph로, deep_code_analysis는 legacy로 운영 가능. 마이그레이션 리스크 분산.

### A9. BYOK 옵션 제공
**이유**: 영상 비용 변동성 흡수. Pro $99 - 운영비 $66 = 마진 $33 (33%)는 안정적이지만 Veo 사용자는 손해. BYOK로 사용자 자체 부담 시 플랜 가격 30% 할인 + 마진 보전.

### A10. Stage 2 (RAG) default, Stage 3 (Fine-tune) opt-in
**이유**: Stage 3 fine-tune은 $25 학습비 + 데이터 격리 우려 + voice가 결과적으로 더 좋다는 확실한 증거 없음. RAG로 충분히 매칭 가능 (사용자 voice samples 5개를 프롬프트에 직접 주입).

---

## 부록 B: Open Questions (사용자 결정)

### B.1 확정된 결정사항 (2026-05-16)

1. **자율성 default**: 사용자가 선택 가능 (L0~L3)
   - default는 `assisted` (L1)
   - **사용자가 항상 직접 업로드/삭제/조절 가능** (모든 자율성 레벨에서)
   - 자세한 정책은 §부록 I.7 + §B.3 참조

2. **언어**: **한국어 + 영어 둘 다 1급 지원**
   - Content Agent가 두 언어 모두 voice 매칭 가능
   - 임베딩: Cohere embed-v4 (한+영 최강)
   - UI: 두 언어 i18n
   - 자세한 정책은 §B.4 참조

3. **요금제**: **무료 플랜 영구 제공** (14-day trial 없음, Free → Pro 직접 업그레이드)
   - 자세한 정책은 §B.2 + §13.1 참조

### B.2 무료 플랜 정책 (확정)

LaunchPad는 dogfooding이 중요 (LaunchPad가 LaunchPad 마케팅) → 무료 사용자도 입소문 채널.

**Free 플랜 ($0/mo, 영구)**:
- 1 프로젝트
- 일 3개 콘텐츠 (텍스트만)
- 채널 2개 (X + Threads)
- 영상 0개
- AI 답글 X (수동 작성만)
- LaunchPad 워터마크 자동 추가 (작은 텍스트)
- 마켓 인사이트 주 1회 (Pro는 매일)
- 페르소나 학습 RAG only (Fine-tune X)
- 우선순위 큐 제일 아래 (peak time 지연 가능)

**비용 통제** (무료 사용자가 우리 비용 갉아먹지 않게):
- LLM은 Gemini 2.5 Flash만 (Claude/GPT 사용 차단)
- 캐싱 + skill RAG로 사용자당 ~$0.50/mo 비용
- 1000 무료 사용자 = $500/mo (인프라 $192 외 추가)
- 무료 → 유료 전환 5% 가정: 50명 × ($99-$66 마진) = $1,650/mo 수익

**스팸 방지**:
- 이메일 verify 필수
- 첫 24시간 발행 횟수 추가 제한 (1개)
- 새 계정 reputation score 시스템

### B.3 자율성 정책 (확정)

**모든 자율성 레벨에서 사용자가 항상 가능한 행동**:
- 콘텐츠 수동 작성 + 발행
- AI 생성 콘텐츠 편집/삭제
- 예약 발행 취소
- 자동 발행된 콘텐츠 사후 삭제 (플랫폼 API 통해)
- 자동화 룰 일시정지 / 비활성화
- 에이전트 행동 즉시 중단 (Kill Switch)
- 페르소나 / 가드레일 재설정

즉 **자율성은 "AI에게 자동 행동을 허용하는 범위"**이지, **사용자 권한 박탈이 아님**. 어떤 레벨에서도 사용자가 최종 통제권 보유.

| Level | AI 자동 행동 범위 | 사용자 권한 |
|---|---|---|
| L0 Manual | AI는 제안만 (드래프트 작성) | 모든 발행/답글 직접 |
| L1 Assisted | AI 드래프트, 사용자 매번 승인 | 항상 직접 편집 + 발행 + 삭제 |
| L2 Supervised | AI 자동 발행 (저위험만), 일일 다이제스트 | 사후 편집/삭제, 룰 변경, kill switch |
| L3 Autonomous | AI 자동 발행 + 답글, 예외만 보고 | 동일 + 자율성 다운그레이드 가능 |

**자율성 무관 강제 휴먼 게이트** (사용자가 끌 수 없음):
- X 답글/좋아요/팔로우 (정책상 영구)
- 첫 LinkedIn 발행 (계정 보호)
- 비용 단일 작업 > $5 (영상 등)
- Critical 위험 감지 (shadowban 의심, 콘텐츠 모더레이션 실패)

### B.4 언어 정책 (확정)

**한국어 + 영어 동등 1급 지원**:

| 항목 | 정책 |
|---|---|
| Content Agent | 프로젝트 설정에서 primary language 선택 (ko/en/both) |
| Persona 학습 | 두 언어 voice samples 별도 임베딩 |
| Voice 매칭 | 발행 채널 + 언어 조합별 다른 voice 적용 가능 (예: 한국어 X = 캐주얼, 영어 LinkedIn = 격식) |
| 임베딩 | Cohere embed-v4 (한+영 multilingual MTEB 최강) |
| 자막 (영상) | Whisper API multilingual + 한국어 wrap 보정 코드 |
| TTS | ElevenLabs `eleven_multilingual_v2` (한국어 지원, $0.30/1k) |
| UI | i18n (next-intl), default = 사용자 브라우저 lang |
| 시장 인사이트 | 양쪽 시장 모두 수집 (한국 IT 뉴스 + 영어 IH/HN) |
| 글로벌 RAG | 영어 + 한국어 콘텐츠 모두 포함 |

**Skill 파일**: 영어로 작성하고 (LLM이 더 잘 이해), 출력은 user_language로.

### B.5 추가로 결정 필요한 사항

5. **영상 default 길이**: Shorts 15s vs 30s vs 60s?
   - 추천: 30s (engagement 분석상 최적)

6. **첫 무료 영상 크레딧 (Pro 신규)**: 1개 무료 ($3 마케팅비)?
   - 추천: O

7. **답글 자율 default** (Threads/IG/YT): ON vs OFF?
   - 추천: OFF (안전 우선, 1주 사용 후 사용자 결정)

8. **타겟 시장 우선**: 한국 인디 빌더 먼저 vs 글로벌 동시?
   - 추천: 글로벌 (Twitter/IH 트래픽 큼) + 한국 special section

9. **API 액세스**: Agency $299/mo에 public API 포함?
   - 추천: O (LaunchPad → Zapier 등 통합)

---

---

## 부록 C: 프롬프트 캐싱 전략

**왜 중요한가**: 6개 에이전트 × 수천 호출/일 = LLM 비용 폭탄. 캐싱으로 **60-75% 감축** 가능 (검증된 사례 [ProjectDiscovery 59%](https://projectdiscovery.io/blog/how-we-cut-llm-cost-with-prompt-caching)).

### C.1 프로바이더별 캐싱

**Anthropic Claude** — 두 TTL: 5분 ephemeral (write 1.25×) / 1시간 persistent (write 2×). **Read = 0.1× input (90% 할인)**. 1시간 기준 2회 read부터 손익분기. `cache_control` 최대 4 breakpoint.

```python
client.messages.create(
    model="claude-sonnet-4-6",
    system=[
        {"type": "text", "text": SKILL_PROMPT,
         "cache_control": {"type": "ephemeral", "ttl": "1h"}}
    ],
    tools=[{..., "cache_control": {"type": "ephemeral"}}],
    messages=[{"role": "user", "content": task_input}],
)
```

**Gemini 2.5** — **암묵 캐싱 기본 활성화** (자동, 75% 할인). 최소 토큰: Flash 1024 / Pro 2048. 명시적 `CachedContent` API는 TTL 보장 필요시.

```python
from google import genai
client = genai.Client()
resp = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[SKILL_PROMPT, TOOLS_SPEC, task_input],  # 안정 → 동적 순서
)
# usage_metadata.cached_content_token_count 로 히트 확인
```

**OpenAI** — 자동, 1024+ 토큰 prefix에 50% 할인. byte-exact prefix 필수. 5-10분 retention.

### C.2 캐시 친화 프롬프트 설계

**순서가 전부**: `[system → tools → skill → examples → memory → user_input]`. 앞쪽 블록 하나라도 변경되면 **그 뒤 전부 캐시 깨짐**.

LaunchPad 적용:
- 각 에이전트별 `system + tools + skill` 블록을 안정 prefix로 캐싱
- 사용자 입력만 마지막에 append
- 타임스탬프 / user_id / 동적 데이터는 **절대 안정 영역에 X**

### C.3 메트릭

모든 LLM 호출에 emit:
```python
{
  "agent": "content", "model": "claude-sonnet-4-6",
  "prompt_version": "v3.1",
  "prompt_tokens": 4821, "cached_tokens": 4200,
  "cache_hit_rate": 0.87,
  "completion_tokens": 312,
  "cost_usd": 0.0034,
  "outcome_id": "post_abc123",
}
```

목표: 안정 prompt 에이전트(Strategy, RiskGuard) **cache_hit_rate ≥ 0.80**, 동적 에이전트(Content) **≥ 0.60**.

### C.4 신규 테이블

```sql
CREATE TABLE llm_call_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE,
  workflow_run_id uuid REFERENCES workflow_runs(id),
  agent_name      text NOT NULL,
  node_name       text,
  model           text NOT NULL,
  prompt_version  text,
  prompt_tokens   int NOT NULL,
  cached_tokens   int DEFAULT 0,
  completion_tokens int NOT NULL,
  cost_usd        numeric(10,6) NOT NULL,
  latency_ms      int,
  outcome_id      uuid,  -- 나중에 engagement와 join
  occurred_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_llm_call_agent_time ON llm_call_log(agent_name, occurred_at DESC);
```

---

## 부록 D: 컨텍스트 엔지니어링

### D.1 계층 구조

```
[global_system]       ← 캐시 (모든 에이전트 공통)
[role/skill_prompt]   ← 캐시 (에이전트별)
[task_context]        ← 캐시 (안정 부분만, 예: 페르소나)
[sliding_window]      ← 동적
[immediate_input]     ← 동적
```

앞 3개 캐시 = 80% 토큰이 hit.

### D.2 Sliding Window vs Compaction

- **Window** (단순): 최근 N turn만 유지. 짧은 대화용 (<20 turn).
- **Compaction**: 매 10 turn마다 LLM으로 요약 → 구조화 KV로 저장.

Anthropic Memory Tool 패턴:
```
recent_turns: [최근 3개 verbatim]
rolling_summary: "결정: X, 미해결: Y, 산출물: Z"
```

LaunchPad: Content/Engagement 에이전트는 단일 호출이라 window 불필요. Performance/Strategy의 weekly_report 같은 long-running task에 compaction 적용.

### D.3 메모리 티어

| 티어 | 위치 | 예시 |
|---|---|---|
| Working (현재 task) | in-prompt | 지금 만드는 콘텐츠, 트리거 이벤트 |
| Episodic (최근 24h) | RAG (project_id+user_id 필터) | 오늘 발행한 글, 받은 멘션 |
| Semantic (장기) | RAG (전역+프로젝트) | 스킬, 브랜드 voice, 제품 KB |

각 티어에서 top-3만 inject. 무한정 늘리면 **context rot** (30K+ 토큰부터 중간 정보 회상률 급락).

### D.4 멀티 에이전트 컨텍스트 격리

[LangChain Deep Agents (2026.3)](https://www.marktechpost.com/2026/03/15/langchain-releases-deep-agents-a-structured-runtime-for-planning-memory-and-context-isolation-in-multi-step-ai-agents/) 패턴: 각 노드는 **필요한 state field만** 받음.

```python
# Strategy → Content 전달 시
content_input = {
    "brief": state["strategy"]["reasoning"],
    "channels": state["strategy"]["channels"],
    "persona": state["context"]["persona"],
    # RiskGuard audit log, Performance 히스토리는 X
}
```

Content node가 RiskGuard 결과를 알 필요 X = 토큰 절약 + 캐시 안정성.

### D.5 Context Rot 감지

```python
async def track_quality_vs_length():
    # LLM 호출 후 출력 품질 (judge score) + prompt_tokens 기록
    # 7일 trailing로 correlation 계산
    # prompt_tokens 25K+ 구간에서 quality < 0.7 발생 → 알람
```

해결: 각 티어에 hard cap. Old episodic drop, full tool output 절대 inline X (저장 + 링크).

---

## 부록 E: 프롬프트 최적화 (DSPy GEPA)

### E.1 왜 DSPy?

**DSPy GEPA**가 2026 standard. MIPROv2 대비 +13%, GRPO 대비 +20%, **35배 적은 rollout**. 실측: 구조화 추출 +20pt, 의료 NLP +30-40%, MATH 67→93%. [GEPA 논문 (arxiv 2507.19457)](https://arxiv.org/pdf/2507.19457).

수동 프롬프트 작성 < LLM이 학습해서 최적화. 우리도 마찬가지 — Content 에이전트가 generate한 글의 engagement score를 metric으로 GEPA 돌리면 voice 정확도 자동 향상.

### E.2 LaunchPad 적용

```python
import dspy
dspy.configure(lm=dspy.LM("gemini/gemini-2.5-flash"))

class Promote(dspy.Signature):
    """Generate SNS promotion post matching user voice."""
    project_brief: str = dspy.InputField()
    audience: str = dspy.InputField()
    voice_samples: list[str] = dspy.InputField()
    post: str = dspy.OutputField()

program = dspy.ChainOfThought(Promote)

# trainset = past posts with engagement labels
optimized = dspy.GEPA(
    metric=engagement_metric,  # 실측 engagement_rate
    auto="medium",
    reflection_lm=dspy.LM("openai/gpt-4.1"),
).compile(program, trainset=labeled_posts)

optimized.save("content_agent_v3.json")
```

매 N개 발행 후 자동 GEPA 재학습 (예: 100개) → champion vs challenger A/B → 승자 promote.

### E.3 Few-shot 동적 검색

정적 예제 < 동적 검색.
- 현재 task input 임베딩
- pgvector로 user's past posts top-3 retrieve
- Content node 프롬프트에 inject
- 캐시 영향: examples block만 변동, system/tools는 cache hit 유지

### E.4 Self-Consistency / Tree-of-Thought

비싸니까 선택적:
- ✅ **RiskGuard** (이진 결정, 잘못된 차단 비용 큼) → 5-sample majority vote
- ✅ **Strategy** (초기 계획, 한 번 정하면 회복 어려움) → ToT
- ❌ **Content** (대량, 단일 sample 충분)

### E.5 프롬프트 버전 관리

**Langfuse** (self-hosted, 오픈소스). 엔지니어링 팀에 최적.
- 모든 LLM call에 `prompt_version` 태깅
- 24h 후 outcome (engagement) join
- 자동 winner detection (Bayesian A/B)

Helicone은 zero-code 게이트웨이 원할 때, PromptLayer는 PM 직접 편집 케이스. LaunchPad는 Langfuse가 맞음.

### E.6 안티패턴

| 안티패턴 | 영향 |
|---|---|
| 시스템 프롬프트에 timestamp | 매 호출 캐시 미스 |
| 캐시 prefix에 user name | 사용자간 공유 불가 |
| 매 호출마다 tool 순서 변경 | 캐시 깨짐 |
| 4K 토큰 "you are an expert..." | 3.5K 필러 |
| "helpful assistant" 보일러플레이트 | 측정 가능한 토큰 낭비 |

---

## 부록 F: Global + Per-User RAG

### F.1 2-Tier 구조

**Global RAG** (`global_knowledge_chunks`, project_id 없음):
- 마케팅 플레이북, 플랫폼 알고리즘 패턴, 바이럴 템플릿, 경쟁사 분석
- 큐레이션: 주간 admin batch, Substack(Lenny, Justin Welsh), X threads, arXiv social media 논문
- 갱신: 트렌드 monthly, 에버그린 quarterly

**Per-Project RAG** (`project_knowledge_chunks`, project_id + RLS):
- 사용자 voice samples, 과거 글(성과 라벨링), README, PRD, brand-guide
- RLS는 **DB 레이어에서 강제** (앱 코드 버그가 cross-tenant leak 막음)

**검색 결정 트리**:
- "X에 대한 글 써줘" → project (voice) + global (templates) union
- "TikTok 알고 어떻게 작동?" → global only
- "지난 런칭 글 잘 됐어?" → project only
- 기본: 둘 다, RRF로 project 2× 가중

### F.2 임베딩

| 모델 | 비용 | 점수 | LaunchPad |
|---|---|---|---|
| **Cohere embed-v4** | $0.12/M | 한+영 최고 (MTEB) | ✅ default |
| jina-embeddings-v3 | $0.02/M | 65.5 MTEB | fallback |
| OpenAI 3-small | $0.02/M | 한국어 -15% | X (한국어 약함) |

**Chunking**: 일반 문서는 recursive semantic 512 tok / 50 overlap, SNS 포스트는 **1 post = 1 chunk** (절대 분할 X).

**Contextual Retrieval** (Anthropic): 각 chunk 앞에 Haiku 생성 50토큰 컨텍스트 prepend → embed. **49% 검색 실패율 감소**. 프롬프트 캐싱으로 ~$1/M tokens.

### F.3 Hybrid Search (Vector + BM25 + RRF)

순수 vector는 62% precision. Hybrid가 84%+. Product name, 핸들, 해시태그 키워드는 BM25가 강함.

```sql
WITH vec AS (
  SELECT id, row_number() OVER (ORDER BY embedding <=> $1) AS rank
  FROM project_knowledge_chunks
  WHERE project_id = $2 AND embedding <=> $1 < 0.7
  ORDER BY embedding <=> $1 LIMIT 50
),
kw AS (
  SELECT id, row_number() OVER (ORDER BY ts_rank_cd(tsv, plainto_tsquery($3)) DESC) AS rank
  FROM project_knowledge_chunks
  WHERE project_id = $2 AND tsv @@ plainto_tsquery($3) LIMIT 50
)
SELECT id, SUM(1.0/(60+rank)) AS score
FROM (SELECT * FROM vec UNION ALL SELECT * FROM kw) u
GROUP BY id ORDER BY score DESC LIMIT 20;
```

메타데이터 필터(`platform`, `date`)는 **WHERE 절 pre-filter** (post-filter는 candidate 낭비).

### F.4 Reranking

Top-50 → rerank → top-5.
- **Cohere Rerank 3.5** ($2/1k searches, 150ms, 한국어 OK)
- 또는 Gemini Flash inline rerank ($0.001/query, 300ms) — 비용 우선시
- 자체 호스팅: BGE-reranker-v2-m3 (Railway GPU, >50k/day부터 의미)

### F.5 Query Rewriting

- **HyDE**: 모호한 query ("좀 더 강하게") — 가짜 이상적 글 생성 → 임베딩
- **Multi-query**: Flash가 3개 paraphrase 생성 → union → dedupe (voice 검색에 효과적)
- **CRAG**: 검색 후 grader (Flash, "이게 query에 답 되나?") — 모두 0.5 미만이면 web search fallback → "과거 글 없습니다" 환각 방지

### F.6 Document-as-Skill

**스킬 파일을 통째로 prompt에 넣지 않음** — 임베딩 chunk-wise. 매 task마다 관련 섹션만 retrieve. **프롬프트 사이즈 60% 절감**.

Voice few-shot:
```sql
SELECT content FROM project_knowledge_chunks
WHERE project_id = $1
  AND source_type = 'past_post'
  AND engagement_score > (
    SELECT percentile_cont(0.9) WITHIN GROUP (ORDER BY engagement_score)
    FROM project_knowledge_chunks WHERE project_id = $1
  )
ORDER BY embedding <=> $query_embedding
LIMIT 3;
```

→ Content node 프롬프트에 examples로 inject.

### F.7 스키마

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE project_knowledge_chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_doc_id   uuid,
  source_type     text NOT NULL,  -- readme, past_post, voice_sample, prd, brand_guide
  chunk_index     int,
  content         text NOT NULL,
  contextualized_content text,  -- Anthropic 컨텍스트 prepend 버전
  embedding       vector(1024),  -- Cohere embed-v4
  tsv             tsvector GENERATED ALWAYS AS (
                      to_tsvector('simple', coalesce(content, ''))
                  ) STORED,
  embedding_model text DEFAULT 'cohere-embed-v4',
  engagement_score numeric,
  metadata        jsonb DEFAULT '{}',
  embedded_at     timestamptz DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pkc_embedding ON project_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_pkc_tsv ON project_knowledge_chunks USING gin (tsv);

ALTER TABLE project_knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON project_knowledge_chunks
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE TABLE global_knowledge_chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL,  -- "lenny_substack", "viral_threads_corpus"
  category        text NOT NULL,
  content         text NOT NULL,
  contextualized_content text,
  embedding       vector(1024),
  tsv             tsvector GENERATED ALWAYS AS (
                      to_tsvector('simple', coalesce(content, ''))
                  ) STORED,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gkc_embedding ON global_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_gkc_tsv ON global_knowledge_chunks USING gin (tsv);
-- 전역은 RLS 없음 (read-only 공개)
```

### F.8 함정

| 함정 | 대처 |
|---|---|
| Stale embedding (문서 수정) | `embedded_at` 컬럼, 매일 diff scan |
| Cross-tenant leak | **DB-level RLS** (앱 코드만으로 X), SQL fuzz 테스트 |
| Embedding model 교체 | `embedding_model` 컬럼, dual-write 마이그레이션 |
| Retrieval hallucination | threshold `cosine_distance < 0.5`, 미달 시 "no context" fallback |

### F.9 비용

per document: Haiku contextualize ~$0.0003 + Cohere embed ~$0.0001 = **~$0.0004/doc**.

---

## 부록 G: 스킬 시스템 v2 (Anthropic SKILL.md)

### G.1 Anthropic Skills 표준 채택

[Anthropic Skills (2025.12 spec, 2026.1 Linux Foundation 기증)](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)가 universal `SKILL.md` 표준. 32+ 도구 채택 (Gemini CLI, Junie, Kiro, Goose). **기존 8개 markdown 파일을 이 spec으로 마이그레이션**.

**Progressive Disclosure 3-tier**:
1. **Discovery** — `name` + `description`만 (~100토큰/skill), 시작 시 전체 로드
2. **Activation** — 매칭되면 full body 로드
3. **Execution** — 참조 파일/스크립트 on-demand 로드

기존 trigger-keyword router는 맞는 방향. Frontmatter만 표준 모양으로 정렬.

### G.2 스킬 컴포지션

```yaml
---
name: promotion
description: SNS promotion post generation
requires: [web_search, knowledge_base]
extends: default/promotion  # per-project 오버라이드 시
version: 2.1
routing_weight: 1.0
tools: [sns.create_draft, knowledge.search]
mocks:
  - tool: sns.create_draft
    response: {id: "mock_123", status: "draft"}
---
```

- DAG resolver가 cycle 방지 (`loaded_skills: set`)
- Dynamic loading 깊이 cap 3, 토큰 budget ~8K
- `extends`로 project-level 오버라이드 가능 (`workspaces/{pid}/skills/`)

### G.3 스킬 효과 측정

```sql
CREATE TABLE skill_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id),
  workflow_run_id uuid REFERENCES workflow_runs(id),
  skill_id        text NOT NULL,
  skill_version   text NOT NULL,
  triggered_at    timestamptz NOT NULL DEFAULT now(),
  selected        boolean NOT NULL,  -- 트리거됐지만 사용 안 될 수도
  completion_status text,
  outcome_id      uuid,  -- 24h 후 engagement와 join
  outcome_score   numeric  -- 사후 채워짐
);
```

대시보드에서 표시:
- `trigger_count` / `selected_count` / `completion_rate` / `downstream_engagement`
- 트리거되지만 결과 안 좋은 스킬 = pruning 후보

### G.4 문서 기반 스킬 자동 생성

**파이프라인** (주간 cron):
1. 아티팩트 수집: README, PRD, brand-guide, top-10 engagement post
2. **Skill-generator meta-skill** 호출 → 유효한 SKILL.md frontmatter + body 출력
   - 제약 추출 ("항상 한국어, 소문자, 이모지 X")
   - top post에서 3-5 few-shot example mining
   - 저성과 post에서 forbidden patterns 추출
3. `workspaces/{pid}/skills/promotion.md` 저장
4. provenance 기록: `generated_from: [README.md@sha, top_posts@2026-05-20]`
5. **diff 체크** — 사용자 수동 편집 보존, 충돌 시 알림

### G.5 스킬 RAG 검색

기존: 매 prompt에 전체 skill 파일 inject
신규: skill chunk-wise 임베딩 → task별 관련 섹션만 retrieve → **prompt 60% 절감**

---

## 부록 H: 툴 콜링 아키텍처 + MCP

### H.1 Tool Granularity

**10-15개 small specific > 3개 super-tool**.
- Anthropic 신뢰도 8.4/10 (small)
- 슈퍼툴은 arg 환각 유발
- Cap: 64 tools/request (Claude/Gemini), 128 (OpenAI)

LaunchPad 31개 OK. **namespace 추가**: `github.list_commits`, `sns.create_draft`.

### H.2 Parallel Tool Calling

[Zylos 2026 벤치](https://zylos.ai/research/2026-04-23-parallel-tool-calling-optimization-ai-agents): 3 parallel tools/turn 최적 (3-5× latency 감소, 40-70% 비용 절감).

```python
@register_tool(
    name="github.list_commits",
    parallel_safe=True,  # state 의존성 없음
    ...
)
```

state 의존성 있는 tool은 `parallel_safe=False` (예: `sns.create_draft` + `sns.publish` 절대 parallel X).

### H.3 구조화 에러

```python
return {
    "ok": False,
    "code": "RATE_LIMIT",
    "retry_after": 60,
    "suggested_fix": "use github.search_code instead",
}
```

LLM이 structured error는 회복하지만 traceback에선 막힘.

### H.4 비용 예산 강제

```python
@register_tool(
    name="market.web_search",
    cost_units=10,  # 추상 단위
    budget="web_search",
)
async def web_search(...):
    if ctx.budget_spent["web_search"] > ctx.budget_limit["web_search"]:
        return {"ok": False, "code": "BUDGET_EXCEEDED"}
    ...
```

### H.5 Tool Result Compression Gateway

```python
async def call_tool_with_compression(name, args, ctx):
    result = await registry[name].handler(args)
    raw_size = len(json.dumps(result))
    if raw_size < 2000:
        return result

    # 큰 결과는 working_memory에 저장 + summary만 반환
    ref_id = await ctx.working_memory.put(result)
    summary = await gemini.summarize(result, schema=registry[name].summary_schema)
    return {
        "ref": ref_id,
        "summary": summary,
        "size": raw_size,
        "fields_available": list(result.keys()),
    }
```

Agent가 나중에 `working_memory.fetch(ref_id, fields=["sha","message"])`로 projection 조회. LangChain Deep Agents 권장 패턴.

### H.6 MCP (Model Context Protocol)

**2026 mainstream**: 97M monthly SDK downloads, 10K+ public servers. Anthropic/OpenAI/Google/Microsoft/Salesforce 채택. OpenAI Assistants API → MCP 전환 (mid-2026).

**우리가 할 일**:

**MCP 서버 노출** (P0):
- 31개 LaunchPad tool을 MCP server로 wrap
- Claude Desktop / Cursor 사용자가 IDE에서 LaunchPad 직접 조작
- **이번 분기 가장 큰 레버리지** — 개발자 워크플로우에 자연 통합

**MCP 클라이언트 컨슈머** (P1):
- 사용자가 자기 Notion / Linear / Figma MCP 연결
- Agent registry에 `source: user_mcp` 태깅
- Per-user OAuth 격리 (cross-tenant 절대 X)

### H.7 LangGraph Tool Filtering

```python
NODE_TOOL_MAP = {
    "strategy": ["github.*", "market.*"],
    "content": ["sns.*", "knowledge.*"],
    "engagement": ["sns.threads_*", "knowledge.*"],
    "asset_gen": ["media.*", "storage.*"],
    "risk_guard": ["internal.*", "moderation.*"],
    "performance": ["sns.*", "analytics.*"],
}

def get_tools_for_node(node_name: str) -> list[Tool]:
    patterns = NODE_TOOL_MAP[node_name]
    return [t for t in REGISTRY if any(fnmatch(t.name, p) for p in patterns)]
```

도구 선택 에러 ~30% 감소 (distractor 감소).

### H.8 Tool Result Caching

Redis 레이어, key: `(tool_name, args_hash, project_id)`, TTL 차등:
- `github.list_commits`: 5분
- `market.web_search`: 1시간
- `knowledge.search`: 10분

6h knowledge sync가 같은 repo 반복 호출 → 캐시로 GitHub API 비용 대폭 절감.

### H.9 Tool Deprecation

```yaml
# registry entry
name: legacy.publish
deprecated: true
replaced_by: sns.publish_v2
removal_date: 2026-07-01
```

loader는 신규 session에서 strip, in-flight agent는 resolve 가능. 30일 후 완전 제거.

---

## 부록 I: 완전 자율화 패턴

### I.1 Plan-Execute-Validate (PEV)

ReAct 졸업, 2026 표준은 **PEV**. Plan을 먼저 다 짜고, 실행 후 validator가 검증.

```python
graph = StateGraph(AgentState)
graph.add_node("plan", planner)         # List[Step] 생성
graph.add_node("execute", executor)     # 현재 step 실행
graph.add_node("validate", validator)   # step 출력 judge
graph.add_node("replan", replanner)     # 남은 step 수정
graph.add_conditional_edges("validate", lambda s:
    "execute" if s.ok and s.remaining else
    "replan"  if not s.ok else END)
```

`plan_tree`를 checkpoint에 저장 → replan은 pending leaf만 수정 (완료된 거 보존).

### I.2 Self-Evaluation (LLM-as-Judge)

**핵심**: judge ≠ generator. Gemini가 생성한 거 → Claude가 judge (sycophancy 방지).

```python
async def judge_content(draft: dict) -> dict:
    judge_llm = build_llm("claude-sonnet-4-6")  # generator는 Gemini였음
    scores = await judge_llm.ainvoke([
        {"role": "system", "content": JUDGE_PROMPT},
        {"role": "user", "content": json.dumps({
            "voice_samples": persona.samples,
            "brand_guide": persona.brand,
            "draft": draft,
        })},
    ])
    # scores = {voice:0.82, brand:0.91, predicted_engagement:0.4, factual:0.99}
    return scores

# 한 축이라도 < 0.7 또는 가중 < 0.8 → 거부
```

2번 regen 후도 실패 → human gate escalation.

### I.3 Reflexion 2026 (ExpeL/ERL)

매 실패 run마다 lesson 1줄을 `project_memory.lessons`에 저장:

```sql
CREATE TABLE agent_lessons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id),
  workflow_run_id uuid REFERENCES workflow_runs(id),
  task_type       text NOT NULL,
  failure_class   text,
  lesson          text NOT NULL,
  embedding       vector(1024),
  applied_count   int DEFAULT 0,
  helpful_count   int DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lessons_embedding ON agent_lessons USING hnsw (embedding vector_cosine_ops);
```

다음 attempt에서 현재 task 임베딩 → top-3 lesson retrieve → system prompt에 inject.

### I.4 Failure Taxonomy + Circuit Breaker

| Class | 조건 | 대응 |
|---|---|---|
| Transient | API 5xx, timeout | Exponential backoff 3회 (1s/4s/16s) |
| Tool-permanent | 401, revoked | 워크플로우 일시정지 + 사용자 알림 |
| Logic-permanent | judge 3회 거부 | 템플릿 fallback, human queue |
| Cascading | 1 실패가 downstream 트리거 | Circuit breaker trip |

**Circuit Breaker** ([retry storms 패턴 2026](https://www.lifetideshub.com/retry-storms-multi-agent-systems/)):
```python
class CircuitBreaker:
    failure_threshold = 5  # N
    time_window_min = 10   # M

    async def check(self, key: str):
        recent_failures = await count_failures(key, minutes=self.time_window_min)
        if recent_failures >= self.failure_threshold:
            await freeze_workflows(key, hours=1)
            await alert_user(key, "Circuit breaker tripped")
            raise CircuitOpenError()
```

key 예: `("project_id", "instagram_publish")` — 같은 통합 + 같은 프로젝트 반복 실패.

### I.5 Infinite Loop 방지 (3중 안전장치)

```python
# 1. Hard cap
if state["iteration"] >= 20:
    raise MaxIterationsExceeded()

# 2. No-progress hash
state_hash = hash((
    json.dumps(state["plan_remaining"]),
    state["last_tool_called"],
    embedding_bucket(state["last_output_embedding"]),  # fuzzy
))
if state_hash == state["prev_hash_n3"]:  # 3 iteration 전과 동일
    raise NoProgressError()

# 3. Cost ceiling
if state["cost_usd"] > 2.0:
    state["requires_approval"] = True
if state["cost_usd"] > 5.0:
    raise CostLimitExceeded()
```

cross-run loop 감지: 같은 `(project_id, trigger, input_hash)` 1시간 내 5회+ → 상위 circuit breaker trip.

### I.6 Self-Improvement Loop (주간)

```python
async def weekly_skill_refinement(project_id: str):
    top10 = await fetch_top_engagement_posts(project_id, days=7)
    bottom10 = await fetch_bottom_engagement_posts(project_id, days=7)

    # LLM이 차이 분석
    analysis = await gemini.generate_json(prompt=f"""
        Top posts: {top10}
        Bottom posts: {bottom10}
        What distinguishes top from bottom? Write 2 example pairs.
    """)

    # skill.examples에 append
    skill = await load_skill("promotion", project_id)
    skill.examples.extend(analysis["new_examples"])
    skill.examples = skill.examples[-8:]  # 최근 8개만
    await save_skill(skill)

    # A/B: 20% challenger 운영
    await schedule_ab_test(skill.version_prev, skill.version_new, days=14)
```

14일 후 challenger의 engagement CI lower bound > champion mean → promote.

### I.7 Autonomy Levels

| Level | 설명 | LaunchPad |
|---|---|---|
| L0 (Manual) | 에이전트 제안, 사용자 직접 | Free 플랜 default |
| L1 (Assisted) | 에이전트 draft, 사용자 매번 승인 | Starter default |
| L2 (Supervised Autonomous) | 에이전트 행동, 사용자 일일 다이제스트 | Pro default |
| L3 (Autonomous) | 에이전트 행동, exception만 보고 | Pro opt-in |
| L4 (Full Auto) | 에이전트가 goal까지 결정 | **마케팅 도메인 금지** |

**Graduation rule**:
- L1 → L2: 30일 user-approval rate ≥ 95%
- L2 → L3: 60일 zero rollback
- 항상-on **kill switch** + **opt-in checkpoint** ("LinkedIn 발행은 L3여도 항상 승인")

### I.8 Observability

```sql
CREATE TABLE agent_traces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id uuid NOT NULL REFERENCES workflow_runs(id),
  node_name       text NOT NULL,
  inputs_hash     text NOT NULL,
  reasoning       text,
  outputs         jsonb,
  cost_usd        numeric(10,6),
  duration_ms     int,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_traces_run ON agent_traces(workflow_run_id, occurred_at);
```

**What-if replay**: checkpoint 활용 → 과거 run 다른 config로 재실행 → diff 표시

**Soft alerts** (실패 외 시그널):
- judge score 7일 MA 하락
- cost/run 상승 추세
- engagement 감소

**Weekly digest**: "이번 주 당신의 AI가 한 일" — wins 3개 + misses 3개 + 학습된 lesson

### I.9 Top 5 프로덕션 함정

| 함정 | 감지 | 예방 |
|---|---|---|
| 비용 폭발 | $/hr velocity 알람 | per-run + daily ceiling, cost circuit breaker |
| 평판 손상 | pre-publish judge + profanity/PII filter | L<3은 첫 플랫폼 발행 항상 승인 |
| Voice drift | 주간 voice similarity score vs seed corpus | seed lock + quarterly user 재baseline |
| Stale context | knowledge file TTL + prompt에 "last synced" 명시 | generate 전 sync_knowledge 강제 |
| Cascading failures | failure class 태깅 + 의존성 그래프 | 통합당 circuit breaker, dead-letter queue |

---

## 부록 J: 통합 코드 디렉토리 변경

기존 §20 코드 구조에 부록 C-I 반영 추가:

```
backend/app/
  core/
    llm_router.py              # +캐시 메타 (Anthropic cache_control 자동 주입)
    prompt_cache.py            # NEW — 캐시 hit rate 추적
  agents/
    graph_state.py             # +context 계층 + working_memory
    dspy/                      # NEW — GEPA 최적화 프로그램
      content_program.py
      engagement_program.py
      training_pipeline.py
  rag/                         # NEW — RAG 전용 모듈
    chunker.py
    embedder.py                # Cohere embed-v4
    contextualizer.py          # Anthropic Contextual Retrieval
    hybrid_search.py           # vector + BM25 + RRF
    reranker.py                # Cohere Rerank 3.5
    query_rewriter.py          # HyDE, multi-query, CRAG
    skill_rag.py               # 스킬을 RAG로 변환
  workspace/
    skill_loader.py            # SKILL.md 표준 spec 마이그레이션
    skill_generator.py         # NEW — 문서 → skill 자동 생성
    skill_versioning.py        # NEW — A/B 테스트
  agents/tools/
    registry.py                # +namespace + parallel_safe + cost_units
    compression_gateway.py     # NEW — tool 결과 압축
    cache.py                   # NEW — Redis tool result 캐시
  mcp/                         # NEW — MCP server + client
    server.py                  # LaunchPad tools → MCP 노출
    client.py                  # 사용자 MCP 컨슈머
    auth.py                    # per-user MCP OAuth 격리
  services/
    judge.py                   # NEW — LLM-as-Judge
    reflexion.py               # NEW — lesson 저장 + retrieval
    circuit_breaker.py         # NEW
    pev_engine.py              # NEW — Plan-Execute-Validate
    self_improvement.py        # NEW — 주간 skill 정제
  workers/tasks/
    weekly_skill_refinement.py # NEW
    skill_generation.py        # NEW — 문서 변경 시
```

신규 마이그레이션:
- `009_rag_chunks.sql` — global + per-project chunks + tsvector
- `010_skill_runs.sql` — 스킬 효과 추적
- `011_agent_lessons.sql` — Reflexion
- `012_llm_call_log.sql` — 캐시 hit rate + cost
- `013_agent_traces.sql` — 노드별 trace

---

## 부록 K: 비용 영향 (캐싱 + RAG + GEPA 적용 후)

§13.2 기존 Pro 사용자 운영비를 캐싱/RAG/skill RAG 적용 후 재계산:

| 항목 | 기존 | 적용 후 | 차이 |
|---|---|---|---|
| LLM (Gemini 75% + Mini 20% + Sonnet 5%) | $8 | **$3** (캐시 70% hit + skill RAG 60% 절감) | -$5 |
| 영상 (Kling 30s × 15) | $45 | $45 | - |
| TTS | $5 | $5 | - |
| 임베딩 + reranking (RAG) | $0 | **$2** | +$2 |
| Contextual retrieval (Haiku) | $0 | **$1** | +$1 |
| X API | $0 (BYOK) | $0 | - |
| 인프라 분담 | $7 | $7 | - |
| LangSmith (60일 후 self-host) | $1 | $1 | - |
| **합계** | **$66** | **$64** | -$2 |

Pro $99 → 마진 **$35/mo** (35%). 표면적으로 비슷하지만 **품질이 비교 불가**:
- voice 매칭 정확도 ↑↑
- 환각 ↓↓
- 응답 일관성 ↑↑
- 사용자 voice drift 감지 자동

---

## 부록 L: 마이그레이션 Wave 업데이트

기존 Wave 1-10 외 추가:

**Wave 11: Prompt Engineering Infrastructure** (Week 4-5, Wave 5와 병렬)
- 프롬프트 캐싱 모든 LLM call에 활성화
- llm_call_log 테이블 + 메트릭 수집
- Langfuse self-hosted 셋업
- 캐시 hit rate 대시보드

**Wave 12: RAG Layer** (Week 5-6)
- pgvector + pg_trgm extension
- Cohere embed-v4 통합
- Contextual Retrieval (Haiku)
- Hybrid search SQL function
- Cohere Rerank 3.5 통합
- global_knowledge_chunks 초기 큐레이션 (50-100 chunks)
- Skill RAG 마이그레이션 (기존 markdown → chunks)

**Wave 13: Anthropic Skills Standard** (Week 6)
- SKILL.md 표준 spec 마이그레이션
- skill_runs 테이블 + effectiveness 트래킹
- skill_generator (문서 → 스킬)
- skill versioning + A/B

**Wave 14: MCP Server** (Week 6-7) — 큰 레버리지
- LaunchPad tools → MCP server
- Claude Desktop / Cursor 통합 가이드
- 사용자 MCP 컨슈머 (Notion / Linear / Figma)

**Wave 15: Autonomy Hardening** (Week 7-8)
- PEV (Plan-Execute-Validate) 구현
- LLM-as-Judge (모든 발행 전)
- Reflexion lesson 시스템
- Circuit breaker
- 3중 loop 방지
- Autonomy level graduation

**Wave 16: DSPy GEPA Optimization** (Week 8-9, 출시 후)
- DSPy + GEPA 도입
- Content / Engagement agent 자동 최적화
- 주간 self-improvement cron
- A/B champion-challenger

---

**문서 끝.**

> 이 문서는 **현재 LaunchPad 코드 상태**를 기반으로,
> **2026 시장 리서치** + **구체 구현 패턴** + **프롬프트/RAG/스킬/툴/자율화 deep dive**를 통합한 **최종 청사진 v2.0**입니다.
>
> 변경사항은 이 문서를 우선 업데이트한 후 코드에 반영합니다.
> 의존성 그래프(Wave 1-16)를 따라 작업하되, Wave 내에서는 병렬 진행 가능.
