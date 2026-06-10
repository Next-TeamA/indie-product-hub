# 로컬 개발 환경 셋업

## 파일 구조 (env)

| 파일 | 용도 | git |
|---|---|---|
| `backend/.env` | 로컬에서 백엔드/worker 실행 시 자동 로드. 포트만 로컬용(`3001`/`8001`), 나머지는 prod 와 동일한 API 키 | gitignore |
| `backend/.env.production` | Railway 에 박힌 prod env 의 백업/참조본. 키 잃어버렸을 때 복원용. **실제 prod 런타임은 Railway 가 자체적으로 들고 있음** -- 이 파일은 절대 자동 로드되지 않음 | gitignore |
| `backend/.env.example` | 키 이름만 적힌 템플릿. 새로 셋업하는 사람용 | **tracked** |

`.gitignore` 가 `.env.*` 전부 ignore + `.env.example` 만 예외 처리하고 있어서 안전.

Railway env 를 수정할 때마다 `.env.production` 도 손으로 동기화해 두면 disaster recovery 가 빠름.

## 1) 로컬에서 백엔드만 띄우기

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # 처음만
pip install -r requirements.txt                     # 처음만
uvicorn app.main:app --reload --port 8001
```

- pydantic-settings 가 `backend/.env` 를 자동으로 읽음 (`config.py` 의 `env_file=".env"`)
- 포트 8001 사용 (`BACKEND_PORT=8001`, `BACKEND_URL=http://localhost:8001`)
- 프론트엔드는 별도로 `pnpm dev` (포트 3001)

이 단계까지만 가도 다음은 동작:
- 모든 read API
- 페르소나 import/build
- AMP 콘텐츠/인게이지먼트 그래프 (단, Redis 없으면 영상 enqueue 가 inline 으로 떨어짐)

## 2) Celery worker 까지 로컬에서 띄우기 (영상 생성 테스트)

영상 파이프라인은 Celery + Redis 에 의존. 두 가지 방식.

### 옵션 A -- Redis + worker 띄움 (권장)

```bash
# 1. Redis 컨테이너
docker run -d -p 6379:6379 --name launchpad-redis redis:7

# 2. backend/.env 확인
#    REDIS_URL=redis://localhost:6379/0   <- 그대로 두기

# 3. 새 터미널에서 worker
cd backend
source .venv/bin/activate
celery -A app.workers.celery_app.celery_app worker --loglevel=info --concurrency=1

# 정상 부팅 시:
# [tasks]
#   . video.generate
# [INFO/MainProcess] celery@... ready.
```

이 상태에서 영상 생성 트리거하면 worker 로그에 `Received task: video.generate[...]` 가 떠야 정상.

### 옵션 B -- Redis 안 띄움 (간이)

`backend/.env` 에서 `REDIS_URL=` 한 줄을 빈 값으로 바꾸면:
- Celery worker 띄울 필요 없음
- `asset_gen._enqueue_video` 가 [`if not enqueued`] 분기로 떨어져 **inline 실행** (5~10분 블로킹)
- 요청한 uvicorn 워커가 그 시간 동안 막힘. 한 번에 영상 하나만 테스트할 때 OK

## 3) 프론트엔드 띄우기

```bash
cd frontend
pnpm install   # 처음만
pnpm dev       # 포트 3001
```

`frontend/.env.local` 에 (없으면 만들기):
```
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_SUPABASE_URL=https://eycsyfbybluixivkidvl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<backend/.env 의 SUPABASE_KEY 값>
```

## 4) 외부 webhook 도 테스트하려면 (선택)

X/Threads OAuth, GitHub/Vercel webhook, fal.ai 영상 완료 콜백 -- 다 외부에서 백엔드 URL 에 도달해야 함. localhost 는 도달 불가라 [ngrok](https://ngrok.com/) 등 https 터널 필요.

```bash
ngrok http 8001
# -> https://xxxx.ngrok-free.app
```

그 URL 을 `.env` 의 `BACKEND_URL` 에 임시로 박고, fal/X/Threads 콘솔의 callback URL 도 같이 바꿔둠. 테스트 끝나면 원복.

## 알려진 함정

- **Supabase prod DB 공유**: 로컬에서도 prod 데이터를 읽고 쓰는 셋업이라 DELETE/UPDATE 큰 SQL 은 staging branch 에서 하거나 별도 dev project 만들기 권장.
- **Redis URL placeholder**: `.env.production` 에 보면 `REDIS_URL=${{Redis.REDIS_URL}}` 인데 이건 Railway template syntax. 로컬에선 그대로 두면 안 됨 (실제 URL 로 바꿔야 함).
- **fal webhook**: 로컬에선 webhook 콜백이 fal -> localhost 못 옴. 영상 결과는 webhook 없이 직접 poll 로 받음 (`fal_ai.get_result`) -- 이 경로는 동작.
- **포트 3000/8000 도 안 충돌**: vercel preview 가 가끔 3000 잡으므로 로컬 dev 는 3001/8001 사용.

## 키 로테이션 (지금)

이번에 채팅에 키 평문 노출됨. 마음에 걸리면 다음 순서로 회수:

1. **Supabase**: Settings → API → Reset JWT secret, anon/service_role 도 재발급 옵션 (단 모든 클라이언트 재배포 필요)
2. **fal.ai**: Dashboard → Keys → 기존 key Revoke + 새 발급
3. **ElevenLabs**: Profile + API key → 기존 revoke + 재발급
4. **X / Threads / GitHub OAuth**: 각 콘솔에서 Client Secret 재발급
5. **R2**: Dashboard → R2 → Manage API Tokens → 기존 토큰 revoke + 새 발급
6. 새 값들 → `.env` (로컬) + Railway env + `.env.production` 셋 다 동기화

전부 다 할 필요는 없고, 외부에서 도달 가능한 것 (Supabase service_role, fal, R2, OAuth secret) 부터 우선.
