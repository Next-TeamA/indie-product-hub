# LaunchPad 고도화 기능 요약

## 1. 자율 AI 에이전트 시스템

프로젝트별로 동작하는 자율 AI 에이전트. 사용자가 질문하면 에이전트가 스스로 어떤 도구를 호출할지 판단하고, 데이터를 수집하고, 분석 결과를 도출한다.

**핵심 구조:**
- Gemini Function Calling 기반 자율 루프 (plan -> tool call -> observe -> iterate)
- 31개 도구: GitHub 7개, 배포 5개, SNS 8개, 시장 3개, 지식베이스 3개, 내부 4개, 위임 1개
- 4개 서브에이전트: 배포 모니터, GitHub 분석기, SNS 매니저, 시장 조사기
- 마스터 에이전트가 복잡한 요청을 서브에이전트에 위임

**사용 예시:**
- "이번 주 배포 실패 원인 분석해줘" -> GitHub 커밋/코드 + Vercel 빌드 로그 자동 추적
- "프로모션 게시물 초안 만들어줘" -> 최근 커밋/PR 기반 컨텍스트로 AI 생성
- "경쟁사 동향 알려줘" -> 웹 검색 + 기존 시장 인사이트 종합 분석

**기술 차별점:**
- 외부 에이전트 프레임워크(LangChain, CrewAI) 없이 경량 구현
- 저장된 데이터 우선 사용으로 API 비용 최소화
- 프로젝트 지식베이스를 시스템 프롬프트에 자동 주입

---

## 2. 프로젝트별 지식 베이스 자동 구축

6시간마다 프로젝트의 모든 활동 데이터를 수집해 구조화된 문서로 자동 생성.

**수집 대상:**
- GitHub: 최근 커밋 15개, PR 10개
- 배포: 최근 배포 로그 15건 (성공/실패, 에러 메시지)
- SNS: 주간 노출/좋아요/댓글/리포스트 집계
- 시장: 최근 시장 인사이트 10건

**자동 README 생성:**
- 위 데이터를 종합해 프로젝트별 README 자동 생성
- AI 에이전트가 매 실행 시 이 README를 읽고 프로젝트를 깊이 이해

---

## 3. AI 프로모션 게시물 생성 (GitHub 컨텍스트 반영)

Gemini AI가 프로모션 게시물을 생성할 때, 프로젝트의 최근 개발 활동을 자동으로 참조.

**컨텍스트 자동 주입:**
- 최근 커밋 5개 (어떤 기능이 개발됐는지)
- 최근 PR 5개 (어떤 변경이 머지됐는지)
- 프로젝트 설명, PRD, 타겟 사용자 정보

**지원 플랫폼:**
- X (Twitter): 280자 제한, 간결한 톤
- Threads: 500자 제한, 대화형 톤

**실제 발행:**
- 에디터에서 AI 생성 -> 편집 -> 바로 X/Threads에 발행
- 예약 발행 (5분 주기 체크)
- 발행 실패 시 자동 에러 알림

---

## 4. 실시간 에러 감지 + 코드 레벨 원인 분석

Vercel Log Drain을 통해 런타임 에러를 실시간 감지하고, 에러 발생 시 GitHub 코드까지 추적해서 원인을 분석.

**2단계 분석:**
1. 기본 분석: 에러 로그에서 원인/심각도/수정 방법 도출
2. 심층 분석 (Deep Analysis): 에러 로그의 파일 경로/라인 넘버 추출 -> GitHub에서 해당 소스 코드 + 최근 커밋 diff 가져오기 -> 실행 경로 추적 -> 어떤 커밋이 문제를 만들었는지 특정

**자동 대응:**
- 에러 3건 이상 누적 시 자동 Deep Analysis 트리거
- 분석 결과로 자동 이슈 생성
- 사용자에게 알림 + 수정 코드 제안

---

## 5. SNS 메트릭 자동 수집 + 시각화

발행된 게시물의 성과 지표를 자동 수집해서 대시보드에 시각화.

**수집 메트릭:**
- X: 노출, 좋아요, 댓글, 리트윗, 인용, 북마크, URL 클릭, 프로필 클릭
- Threads: 조회수, 좋아요, 댓글, 리포스트, 인용

**수집 주기:**
- 최근 게시물: 30분마다
- 오래된 게시물: 6시간마다 (비용 최적화)

**시각화:**
- 인사이트 페이지에 일별 노출 추이 차트 (실제 데이터 기반)
- 플랫폼별 성과 비교
- 주간 변화율 (전주 대비)

---

## 6. 시장 인사이트 자동 생성

매일 Gemini AI + Google Search Grounding으로 경쟁사/트렌드/기회를 분석.

**분석 내용:**
- 직접 경쟁 제품의 최근 동향
- 관련 산업 트렌드
- 활용 가능한 기회 포착

**특징:**
- 기존 인사이트와 중복 방지 (최근 10건 비교)
- 긴급도 자동 판별 (is_urgent 플래그)
- 관련성 점수 0.0~1.0 자동 부여

---

## 7. 프로젝트별 서비스 연결 (Per-Project Linking)

프로젝트 생성 시 GitHub 레포, Vercel/Railway 프로젝트를 각각 선택해서 연결.

**온보딩 플로우 (4단계):**
1. 프로젝트 정보 (이름, 설명, PRD)
2. GitHub 레포 선택 (OAuth 연결 -> 레포 목록 -> 선택)
3. 배포 플랫폼 선택 (Vercel/Railway 연결 -> 프로젝트 선택)
4. SNS 채널 연결 (X/Threads OAuth)

**OAuth 상태 보존:**
- 온보딩 중 OAuth 리다이렉트 시 sessionStorage에 상태 저장
- OAuth 완료 후 원래 단계로 복귀 (데이터 유실 없음)

---

## 8. 배포 플랫폼 연동 + 서비스 상태 모니터링

Vercel/Railway 배포 상태를 실시간으로 수신하고, 서비스 헬스를 동적으로 표시.

**웹훅 수신:**
- GitHub: push, deployment_status, pull_request
- Vercel: deployment.created, deployment.succeeded, deployment.error
- Railway: SUCCESS, FAILED, CRASHED, BUILDING

**서비스 헬스:**
- 배포 데이터에서 동적 생성 (하드코딩 없음)
- 최근 배포 성공률 기반 상태 표시 (healthy/degraded/down)

---

## 9. 예약 작업 (Background Scheduler)

| 작업 | 주기 | 설명 |
|------|------|------|
| SNS 메트릭 동기화 | 30분 | X/Threads 성과 지표 수집 |
| 예약 발행 | 5분 | 예약된 게시물 자동 발행 |
| 토큰 갱신 | 1시간 | OAuth 토큰 자동 갱신 |
| 시장 인사이트 | 매일 8시 | AI + 웹 검색으로 경쟁사/트렌드 분석 |
| 주간 리포트 | 월요일 9시 | 주간 종합 보고서 + 알림 |
| 지식 베이스 동기화 | 6시간 | GitHub/배포/SNS/시장 데이터 문서화 |
| OAuth 정리 | 1시간 | 만료된 OAuth 상태 정리 |
| 에이전트 헬스체크 | 매일 9:30 | AI 에이전트가 자율적으로 프로젝트 상태 점검 |

---

## 기술 스택

- **Backend**: FastAPI + Supabase (PostgreSQL + RLS)
- **Frontend**: Next.js 16 + Tailwind CSS + Motion
- **AI**: Google Gemini 2.5 Flash (Function Calling, Search Grounding, JSON mode)
- **배포**: Vercel (Frontend) + Railway (Backend)
- **인증**: Supabase Auth (Google OAuth) + Per-user OAuth (GitHub, X, Threads, Vercel, Railway)
- **보안**: Fernet 토큰 암호화, HMAC 웹훅 검증, Rate Limiting
