# indie-product-hub

Indie Product Hub -- 인디 해커를 위한 프로덕트 관리/홍보 플랫폼

## Tech Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui + motion
- **Backend**: FastAPI + Python 3.11+
- **DB/Auth**: Supabase (PostgreSQL + Google OAuth)
- **Deploy**: Vercel (frontend) + Railway (backend)

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase project (Google OAuth enabled)

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
# .env.local에 Supabase URL, Anon Key 입력

npm install
npm run dev
# http://localhost:3000
```

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# .env에 Supabase URL, Anon Key, Service Role Key 입력

uvicorn app.main:app --reload
# http://localhost:8000
```

### Environment Variables

**Frontend** (`.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL` -- Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- Supabase anon (public) key
- `NEXT_PUBLIC_API_URL` -- Backend API URL

**Backend** (`.env`)

- `SUPABASE_URL` -- Supabase project URL
- `SUPABASE_KEY` -- Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` -- Supabase service role key (secret)
- `FRONTEND_URL` -- Frontend URL for CORS

### API Health Check

```bash
curl http://localhost:8000/api/health
# {"status": "ok"}
```
