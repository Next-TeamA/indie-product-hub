-- Settings: user_preferences & api_keys
-- Supabase SQL Editor에서 실행

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
