# LaunchPad 고도화 기능 요약

## 1. Skill 기반 자율 AI 에이전트

프로젝트별로 동작하는 자율 AI 에이전트. 파일 기반 skill 아키텍처로 에이전트가 태스크에 맞는 skill을 자동 선택하고 반복 실행한다.

### 아키텍처

프로젝트 생성 시 Supabase Storage에 workspace가 자동 생성된다:

```
workspaces/{project_id}/
  README.md              -- 프로젝트 요약 (자동 생성/갱신)
  skills/
    promotion.md         -- 홍보 글쓰기 (5-Part Arc, 슬롯 타입, 훅 공식)
    deploy_analysis.md   -- 배포 에러 분석 (로그 추적, 원인 진단)
    deep_code_analysis.md -- 코드 레벨 에러 추적 (소스코드 + 커밋 diff)
    market_research.md   -- 시장 조사 (웹 검색 + 경쟁사 분석)
    weekly_report.md     -- 주간 리포트 (성과 집계 + 권장 사항)
    health_check.md      -- 일일 헬스체크 (배포/이슈/SNS 상태)
    web_search.md        -- 웹 검색 (실시간 정보 조회)
  knowledge/
    commits.md           -- 최근 커밋 (6시간 자동 동기화)
    prs.md               -- 최근 PR
    deploy_history.md    -- 배포 로그 요약
    sns_metrics.md       -- SNS 성과 데이터
    market_context.md    -- 시장 인사이트 요약
  references/
    promotion_templates.md -- 팀이 추가하는 레퍼런스 (확장 가능)
```

### Skill 파일 구조

각 skill 파일은 frontmatter 메타데이터 + 본문으로 구성:

```markdown
---
name: Promotion Writing
description: Generate authentic indie hacker promotional posts
triggers: ["promotion", "post", "SNS", "draft"]
tools_needed: ["sns_promotion_references", "sns_published_posts"]
max_iterations: 4
output_format: json
---

## Role / Rules / Slot Types / Examples / Output Schema
```

- `triggers`: 이 키워드가 태스크에 포함되면 자동 선택
- `tools_needed`: 이 skill 실행 시 사용 가능한 도구
- `max_iterations`: 에이전트 반복 횟수 상한

### 에이전트 실행 흐름

```
1. 태스크 수신 (예: "홍보 게시물 만들어줘")
2. workspace/README.md 읽기 (프로젝트 컨텍스트)
3. SkillRouter가 trigger 키워드로 skill 자동 선택
   -> "홍보" 매칭 -> promotion.md 선택
4. skill 파일 로드 -> 시스템 프롬프트에 주입
5. skill.tools_needed 기반 도구 필터링
6. Gemini Function Calling 루프 실행
   -> 도구 호출 -> 결과 평가 -> 필요 시 추가 도구 호출
7. 에이전트가 추가 skill 필요하면 load_additional_skill 도구 호출
8. 최종 결과 반환 (skill의 output_format에 맞게)
```

### 모든 LLM 호출 통합

기존에 9개의 독립적 LLM 호출이 각각 하드코딩된 프롬프트를 사용했다. 이제 전부 skill 파일에서 프롬프트를 로드한다:

| LLM 호출 지점 | 사용하는 Skill | 용도 |
| --- | --- | --- |
| 홍보 글 생성 | promotion.md | AI 기반 SNS 게시물 작성 |
| push 자동 홍보 | promotion.md | GitHub push 시 자동 드래프트 |
| 배포 에러 분석 | deploy_analysis.md | Vercel/Railway 에러 진단 |
| 코드 심층 분석 | deep_code_analysis.md | 소스코드 + 커밋 추적 |
| 시장 인사이트 | market_research.md | 경쟁사/트렌드 웹 검색 |
| 주간 리포트 | weekly_report.md | 성과 요약 자동 생성 |
| 일일 헬스체크 | health_check.md | 배포/이슈/SNS 상태 점검 |
| 에이전트 API | 자동 선택 | 사용자 태스크에 맞는 skill |

### 도구 목록 (31개)

| 도메인 | 도구 수 | 주요 기능 |
| --- | --- | --- |
| GitHub | 7 | 커밋/PR/이슈 조회, 코드 읽기, CI 상태 |
| 배포 | 5 | 배포 로그, Vercel/Railway 상태, 성공률 |
| SNS | 9 | X/Threads 메트릭, 게시물 드래프트, 레퍼런스 조회 |
| 시장 | 3 | 웹 검색, 저장된 인사이트, 신규 인사이트 생성 |
| 지식베이스 | 3 | 카테고리별 조회, README, 목록 |
| 내부 | 4 | 이슈, 알림, 프로젝트 요약 |

### 기술적 차별점

- 외부 프레임워크(LangChain, CrewAI) 없이 경량 구현
- Skill 파일 수정으로 코드 배포 없이 AI 동작 변경 가능
- 팀이 references/ 폴더에 파일 추가하면 에이전트가 자동 참조
- 저장된 데이터 우선 사용으로 API 비용 최소화

---

## 2. 프로젝트별 지식 베이스

6시간마다 프로젝트의 활동 데이터를 수집해 구조화된 마크다운 파일로 자동 생성. DB (핫 캐시)와 Supabase Storage (소스 오브 트루스) 양쪽에 동기화.

| 수집 대상 | 저장 파일 | 내용 |
| --- | --- | --- |
| GitHub 커밋 15개 | knowledge/commits.md | 날짜, 메시지, 작성자 |
| GitHub PR 10개 | knowledge/prs.md | 상태, 제목, 머지 여부 |
| 배포 로그 15건 | knowledge/deploy_history.md | 플랫폼, 성공/실패, 에러 |
| SNS 주간 집계 | knowledge/sns_metrics.md | 노출, 좋아요, 댓글 합계 |
| 시장 인사이트 10건 | knowledge/market_context.md | 경쟁사, 트렌드, 기회 |

README.md는 위 전체를 종합한 프로젝트 요약으로, 에이전트가 매 실행 시 첫 번째로 읽는다.

---

## 3. AI 프로모션 시스템

### 글쓰기 지식 베이스

docs/promotion/*.md에서 추출한 인디 해커 홍보 패턴을 promotion.md skill로 구조화:

- 5-Part Arc: Hook -> Context -> Solution -> Proof -> CTA
- 6가지 슬롯 타입: feature_intro, problem_raising, feedback_request, update_share, dev_insights, launch
- 3가지 보이스 페르소나: vulnerable (초기), expert (확립), community_first (성장기)
- 훅 공식: 숫자, 질문, 취약성, 리프레임, Before/After
- 플랫폼별 규칙: Threads (500자, 대화형), X (280자, 간결)

### 레퍼런스 기반 생성

promotion_references 테이블에 슬롯 타입별 레퍼런스 예시 저장. 생성 시:
1. 사용자 메시지에서 슬롯 타입 추론
2. 해당 타입의 레퍼런스 2-3개 조회
3. 프로젝트 지식베이스 (커밋, PR) + 레퍼런스 + skill 규칙으로 생성

### GitHub 컨텍스트 자동 주입

AI가 글을 생성할 때 최근 커밋 5개 + PR 5개를 프롬프트에 포함. 지식베이스가 있으면 거기서 읽고, 없으면 GitHub API 직접 호출.

### 실제 발행

에디터에서 AI 생성 -> 편집 -> X/Threads에 실제 발행. 예약 발행 (5분 주기 체크), 발행 실패 시 알림, 외부 삭제 감지 (30분 주기).

---

## 4. 실시간 에러 감지 + 코드 레벨 분석

### 2단계 분석

1. **기본 분석** (deploy_analysis skill): 빌드 로그에서 에러 타입, 원인, 수정 방법 도출
2. **심층 분석** (deep_code_analysis skill): 에러 로그의 파일 경로/라인 추출 -> GitHub에서 소스 코드 + 최근 커밋 diff 가져오기 -> 실행 경로 추적 -> 원인 커밋 특정

### 자동 트리거

- Vercel Log Drain: 런타임 에러 실시간 수신 -> 3건 이상 누적 시 심층 분석
- 웹훅: 배포 실패 시 자동 이슈 생성 + 알림
- 분석 결과에 수정 코드 (before/after) 포함

---

## 5. SNS 메트릭 수집 + 시각화

| 플랫폼 | 수집 메트릭 |
| --- | --- |
| X | 노출, 좋아요, 댓글, 리트윗, 인용, 북마크, URL 클릭, 프로필 클릭 |
| Threads | 조회수, 좋아요, 댓글, 리포스트, 인용 |

- 30분 주기 자동 수집 (오래된 게시물은 6시간)
- 일별 노출 추이 차트 (인사이트 페이지)
- 외부 삭제 감지 (API 404 -> "failed" 상태로 업데이트)

---

## 6. 시장 인사이트

매일 Gemini + Google Search Grounding으로 경쟁사/트렌드/기회 분석. market_research skill 기반.

- 중복 방지 (최근 10건 제목 비교)
- 긴급도 자동 판별 + 관련성 점수 0.0~1.0
- 인사이트 페이지에서 뉴스 카드로 표시

---

## 7. 프로젝트별 서비스 연결

### 온보딩 (4단계)

1. 프로젝트 정보 (이름, 설명, PRD)
2. GitHub 레포 선택 (OAuth -> 레포 목록 -> 선택)
3. 배포 플랫폼 (Vercel/Railway -> 프로젝트 선택)
4. SNS 채널 (X/Threads OAuth)

### 프로젝트별 설정 페이지

`/projects/[id]/settings`에서 연결된 서비스를 프로젝트별로 변경 가능:
- GitHub 레포 변경 + 조직 권한 관리 링크
- 배포 플랫폼 변경 (Vercel/Railway)
- SNS 계정 연결/재연결 (X/Threads)

### OAuth 상태 보존

온보딩 중 OAuth 리다이렉트 시 sessionStorage에 상태 저장. 복귀 후 원래 단계로 자동 복원.

---

## 8. 배포 모니터링

- GitHub/Vercel/Railway 웹훅으로 배포 이벤트 실시간 수신
- 배포 로그 테이블에 저장 (커밋, 상태, 에러 메시지)
- 서비스 헬스: 배포 데이터에서 동적 생성 (성공률 기반 healthy/degraded/down)

---

## 9. 백그라운드 자동화

| 작업 | 주기 | 설명 |
| --- | --- | --- |
| SNS 메트릭 동기화 | 30분 | X/Threads 성과 지표 수집 + 삭제 감지 |
| 예약 발행 | 5분 | 예약된 게시물 자동 발행 |
| 토큰 갱신 | 1시간 | OAuth 토큰 자동 갱신 |
| 시장 인사이트 | 매일 8시 | AI + 웹 검색 경쟁사/트렌드 |
| 주간 리포트 | 월요일 9시 | 주간 종합 보고서 + 알림 |
| 지식 베이스 동기화 | 6시간 | GitHub/배포/SNS/시장 -> workspace 파일 |
| OAuth 정리 | 1시간 | 만료된 OAuth 상태 정리 |
| 에이전트 헬스체크 | 매일 9:30 | AI 에이전트 자율 프로젝트 점검 |

---

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Backend | FastAPI + Supabase (PostgreSQL + RLS + Storage) |
| Frontend | Next.js 16 + Tailwind CSS + Motion |
| AI | Google Gemini 2.5 Flash (Function Calling, Search Grounding, JSON mode) |
| 에이전트 | 커스텀 Skill 기반 루프 (프레임워크 없음) |
| 배포 | Vercel (Frontend) + Railway (Backend) |
| 인증 | Supabase Auth (Google) + Per-user OAuth (GitHub, X, Threads, Vercel, Railway) |
