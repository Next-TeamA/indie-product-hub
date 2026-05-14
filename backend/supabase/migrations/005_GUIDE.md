# DB 마이그레이션 가이드 — 설정 페이지 테이블 추가

설정 페이지(알림 설정, API 키 관리) 기능을 위해 Supabase에 테이블 2개를 추가해야 합니다.

---

## 실행 방법

### 1. Supabase 대시보드 접속

1. [https://supabase.com](https://supabase.com) 접속 후 로그인
2. 프로젝트 선택

### 2. SQL Editor 열기

좌측 사이드바에서 **SQL Editor** 클릭

![SQL Editor 위치: 왼쪽 메뉴 > SQL Editor]

### 3. SQL 실행

아래 SQL을 전체 복사한 뒤 SQL Editor에 붙여넣고 **Run** 버튼 클릭

```sql
-- 사용자 알림 설정
create table if not exists user_preferences (
  user_id uuid references auth.users(id) on delete cascade primary key,
  notifications jsonb not null default '{"deploy":true,"issue":true,"weekly_report":true,"security":true,"marketing":false}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_preferences enable row level security;

create policy "user_preferences_owner" on user_preferences
  for all using (auth.uid() = user_id);

create trigger user_preferences_updated_at
  before update on user_preferences
  for each row execute function update_updated_at();

-- API 키 관리
create table if not exists api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

alter table api_keys enable row level security;

create policy "api_keys_owner" on api_keys
  for all using (auth.uid() = user_id);

create index if not exists api_keys_user_id_idx on api_keys(user_id);
```

### 4. 확인

실행 후 좌측 사이드바 **Table Editor**에서 아래 두 테이블이 생성됐는지 확인

- `user_preferences`
- `api_keys`

---

## 생성되는 테이블 설명

| 테이블 | 용도 |
|---|---|
| `user_preferences` | 사용자별 알림 설정 (배포/이슈/주간리포트/보안/마케팅 알림 on/off) |
| `api_keys` | 사용자가 발급한 API 키 관리 (실제 키는 해시로만 저장, 보안 처리됨) |

두 테이블 모두 **RLS(Row Level Security)** 가 적용되어 있어 본인 데이터만 읽고 쓸 수 있습니다.

---

## 주의사항

- `update_updated_at` 함수는 기존 스키마에 이미 정의되어 있어야 합니다. 만약 오류가 발생하면 `schema.sql`을 먼저 실행해주세요.
- SQL은 `if not exists` 조건이 포함되어 있어 **중복 실행해도 안전**합니다.
