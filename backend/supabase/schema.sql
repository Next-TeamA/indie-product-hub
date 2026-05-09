-- Indie Product Hub DB Schema
-- Supabase SQL Editor에서 실행

-- 프로젝트
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  prd text,
  github_repo_url text,
  sns_channels text[] default '{}',
  status text default '준비중',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 캘린더 이벤트
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,
  event_type text not null default 'other',
  date date not null,
  time text,
  description text,
  created_at timestamptz default now()
);

-- 운영 이슈
create table if not exists issues (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,
  description text,
  severity text not null default 'warning',
  category text not null default '기타',
  status text not null default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 홍보 대화 히스토리
create table if not exists promotion_messages (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

-- 홍보 성과 지표 (SNS API 연동 후 적재)
create table if not exists promotion_metrics (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  channel text not null,
  impressions int default 0,
  clicks int default 0,
  recorded_at timestamptz default now()
);

-- updated_at 자동 갱신 트리거
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger issues_updated_at
  before update on issues
  for each row execute function update_updated_at();

-- RLS (Row Level Security)
alter table projects enable row level security;
alter table events enable row level security;
alter table issues enable row level security;
alter table promotion_messages enable row level security;
alter table promotion_metrics enable row level security;

-- 정책: 본인 프로젝트만 접근
create policy "Users can manage own projects"
  on projects for all
  using (auth.uid() = user_id);

create policy "Users can manage events of own projects"
  on events for all
  using (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users can manage issues of own projects"
  on issues for all
  using (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users can manage promotion messages of own projects"
  on promotion_messages for all
  using (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users can view promotion metrics of own projects"
  on promotion_metrics for all
  using (project_id in (select id from projects where user_id = auth.uid()));
