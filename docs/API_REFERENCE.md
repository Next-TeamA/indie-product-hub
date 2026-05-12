# LaunchPad API Reference

Version: 1.0
Last Updated: 2026-05-12

---

## Base URL

- Local: `http://localhost:8000`
- Production: Railway deploy URL

All endpoints prefixed with `/api`.
Authentication: `Authorization: Bearer <supabase_access_token>` (except webhooks and health).

---

## 1. Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Health check |

---

## 2. Projects

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects` | Yes | List user's projects |
| POST | `/api/projects` | Yes | Create project |
| GET | `/api/projects/{id}` | Yes | Get project detail |
| PATCH | `/api/projects/{id}` | Yes | Update project |
| DELETE | `/api/projects/{id}` | Yes | Delete project (cascade) |

### Create Project Body

```json
{
  "name": "TaskFlow",
  "description": "Team task management SaaS",
  "prd": "Product requirements...",
  "github_repo_url": "https://github.com/user/repo",
  "sns_channels": ["x", "threads"]
}
```

---

## 3. Events (Calendar)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/{id}/events` | Yes | List events (filter: `?month=YYYY-MM`) |
| POST | `/api/projects/{id}/events` | Yes | Create event |
| PATCH | `/api/projects/{id}/events/{eid}` | Yes | Update event |
| DELETE | `/api/projects/{id}/events/{eid}` | Yes | Delete event |

### Create Event Body

```json
{
  "title": "Product Hunt Launch",
  "event_type": "promotion",
  "date": "2026-05-15",
  "time": "10:00",
  "description": "Launch on Product Hunt"
}
```

Event types: `promotion`, `deployment`, `marketing`, `meeting`, `milestone`, `other`

---

## 4. Issues

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/{id}/issues` | Yes | List issues (filter: `?status=open`) |
| POST | `/api/projects/{id}/issues` | Yes | Create issue |
| PATCH | `/api/projects/{id}/issues/{iid}` | Yes | Update issue |
| DELETE | `/api/projects/{id}/issues/{iid}` | Yes | Delete issue |

### Create Issue Body

```json
{
  "title": "API response time > 2s",
  "description": "Average response time spiking",
  "severity": "warning",
  "category": "performance"
}
```

Severity: `critical`, `warning`, `info`
Category: `security`, `performance`, `deployment`, `error`, `general`
Status: `open`, `investigating`, `resolved`
Source: `manual`, `vercel`, `railway`, `github`, `system`

---

## 5. Promotion

### Chat-based AI Generation

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/{id}/promotion/history` | Yes | Get chat history |
| POST | `/api/projects/{id}/promotion/generate` | Yes | Generate content with AI |

### Generate Body

```json
{
  "message": "Write a launch announcement for our new dashboard feature",
  "template": "x"
}
```

Template (platform): `x`, `threads`, `bluesky`, `mastodon`, `blog`

### Response

```json
{
  "message": { "id": "...", "role": "assistant", "content": "..." },
  "generated": {
    "hook": "Just shipped the biggest update yet",
    "content": "After 3 weeks of building...",
    "hashtags": ["buildinpublic", "indiedev"]
  }
}
```

LLM prompt includes:
- Project name, description, PRD (first 500 chars)
- Promotion info (target user, key values, tone preference)
- Platform-specific constraints (char limits, culture)
- Anti-AI-slop rules (no emojis, no cliches, authentic tone)

### Promotion Posts CRUD

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/{id}/promotion/posts` | Yes | List posts (filter: `?status=draft&platform=x`) |
| POST | `/api/projects/{id}/promotion/posts` | Yes | Create post (draft) |
| POST | `/api/projects/{id}/promotion/posts/{pid}/publish` | Yes | Publish to SNS (background) |

### Create Post Body

```json
{
  "platform": "x",
  "hook": "Just shipped the biggest update",
  "content": "After 3 weeks of building...",
  "hashtags": ["buildinpublic"],
  "link": "https://taskflow.app",
  "tone": "friendly",
  "content_type": "launch"
}
```

Post status lifecycle: `draft` -> `scheduled` -> `publishing` -> `published` / `failed`

### Promotion Info (Project Context for AI)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/{id}/promotion/info` | Yes | Get promotion context |
| PUT | `/api/projects/{id}/promotion/info` | Yes | Upsert promotion context |

```json
{
  "service_name": "TaskFlow",
  "description": "Team task management for startups",
  "target_user": "Indie hackers, small dev teams",
  "key_values": "Simple, fast, AI-powered insights",
  "site_url": "https://taskflow.app",
  "default_hashtags": ["taskflow", "productivity"],
  "tone_preference": "friendly"
}
```

---

## 6. SNS Metrics

### Stored Snapshots (from periodic sync)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/{id}/sns/metrics` | Yes | Get stored metric snapshots (filter: `?platform=x`) |
| POST | `/api/projects/{id}/sns/sync` | Yes | Trigger manual sync (background) |

### X (Twitter) -- Live Data

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/{id}/sns/x/tweets` | Yes | Recent tweets with full metrics |
| GET | `/api/projects/{id}/sns/x/profile` | Yes | Profile metrics (followers, etc) |

#### X Tweet Metrics Response

```json
[
  {
    "tweet_id": "1234567890",
    "text": "Just shipped v2.0...",
    "created_at": "2026-05-10T10:00:00Z",
    "impressions": 12400,
    "likes": 234,
    "retweets": 45,
    "replies": 12,
    "quotes": 8,
    "bookmarks": 67,
    "url_clicks": 189,
    "profile_clicks": 34,
    "engagement_rate": 2.41
  }
]
```

#### X Metrics Availability

| Metric | Any tweet | Own tweet only | Limit |
|---|---|---|---|
| impressions | O | O | - |
| likes | O | O | - |
| retweets | O | O | - |
| replies | O | O | - |
| quotes | O | O | - |
| bookmarks | O | O | - |
| url_clicks | X | O | 30-day window |
| profile_clicks | X | O | 30-day window |

#### X API Rate Limits

- Read tweets: 900 requests / 15 min (per user)
- Post tweet: 100 / 15 min (per user)
- Cost: ~$0.001/own-read, ~$0.005/other-read, ~$0.01/post

### Threads -- Live Data

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/{id}/sns/threads/posts` | Yes | Recent posts with insights |
| GET | `/api/projects/{id}/sns/threads/profile` | Yes | Profile insights (followers, etc) |

#### Threads Post Metrics Response

```json
[
  {
    "post_id": "17899506...",
    "text": "Building in public update...",
    "created_at": "2026-05-10T10:00:00Z",
    "views": 8900,
    "likes": 156,
    "replies": 23,
    "reposts": 34,
    "quotes": 5,
    "shares": 12,
    "engagement_rate": 2.45
  }
]
```

#### Threads Profile Insights Response

```json
{
  "views": 45000,
  "likes": 2300,
  "replies": 450,
  "reposts": 890,
  "quotes": 120,
  "followers_count": 1234
}
```

#### Threads Metrics Availability

| Metric | Media-level | Profile-level | Limit |
|---|---|---|---|
| views | O | O | Own account only |
| likes | O | O | Own account only |
| replies | O | O | Own account only |
| reposts | O | O | Own account only |
| quotes | O | O | Own account only |
| shares | O | X | Own account only |
| followers_count | X | O | - |
| follower_demographics | X | O | 100+ followers required |
| url clicks | X | Profile-level only | - |

#### Threads API Rate Limits

- ~200 calls/user/hour (standard Graph API)
- Publishing: 250 posts/24h per user
- Insights not available for REPOST_FACADE posts

### Periodic Sync (Background Worker)

SNS metrics are automatically collected every 30 minutes via APScheduler:
- Pulls metrics for all `published` posts with `external_post_id`
- Stores snapshots in `sns_metrics_snapshots` table
- Supports both X and Threads

---

## 7. Insights

### Marketing Insights

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/{id}/insights/marketing` | Yes | Aggregated SNS metrics by channel |

Response includes:
- `totals`: total impressions, clicks, likes, CTR
- `by_platform`: per-platform breakdown
- `post_counts`: total/published/scheduled/draft counts
- `recent_metrics`: last 30 metric snapshots

### Operations Insights

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/{id}/insights/operations` | Yes | Issues + deployment summary |

Response includes:
- `issues`: critical_open, warning_open, resolved, total
- `deployments`: total, success, failed, success_rate
- `recent_deployments`: last 5
- `recent_issues`: last 5

### Market Insights (AI-generated)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/{id}/insights/market` | Yes | List market insights (filter: `?is_read=false`) |
| POST | `/api/projects/{id}/insights/market/generate` | Yes | Trigger generation (background) |
| PATCH | `/api/projects/{id}/insights/market/{mid}` | Yes | Mark read/dismissed |

#### Generation

Uses Gemini 2.5 Flash with **Google Search grounding** (real-time web search).

Generates 2-5 insights per run:
- Competitor analysis (recent moves, launches)
- Market trends (industry shifts)
- Opportunities and threats
- Urgency scoring (0.0-1.0)

Urgent insights automatically create alerts.

#### Response

```json
[
  {
    "id": "...",
    "insight_type": "competitor",
    "title": "Competitor X launched similar feature",
    "summary": "CompetitorX released a dashboard analytics feature last week...",
    "relevance_score": 0.85,
    "is_urgent": true,
    "urgency_reason": "Direct feature overlap with your product",
    "is_read": false,
    "created_at": "2026-05-12T10:00:00Z"
  }
]
```

Insight types: `competitor`, `trend`, `news`, `opportunity`, `threat`

---

## 8. Deployments

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/{id}/deployments` | Yes | List deployment logs |
| POST | `/api/projects/{id}/deployments/sync` | Yes | Manual sync from Vercel/Railway |

Deployment status: `building`, `deploying`, `ready`, `error`, `cancelled`
Platform: `vercel`, `railway`

---

## 9. Connected Accounts

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/accounts` | Yes | List connected accounts |
| GET | `/api/accounts/connect/{provider}` | Yes | Get OAuth URL |
| GET | `/api/accounts/callback/{provider}` | No | OAuth callback (redirects to frontend) |
| DELETE | `/api/accounts/{id}` | Yes | Disconnect account |

Providers: `x`, `threads`, `github`, `vercel`, `railway`

### OAuth Flow

1. Frontend calls `GET /api/accounts/connect/x`
2. Backend returns `{ "auth_url": "https://twitter.com/i/oauth2/authorize?..." }`
3. Frontend redirects user to auth_url
4. User authorizes
5. Provider redirects to `GET /api/accounts/callback/x?code=...&state=...`
6. Backend exchanges code for tokens, encrypts and stores
7. Backend redirects to `{frontend_url}/settings?connected=x`

Token security:
- All tokens encrypted with Fernet symmetric encryption
- Encryption key in `ENCRYPTION_KEY` env var
- Tokens decrypted only at time of use

---

## 10. Alerts

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/alerts` | Yes | List alerts (filter: `?is_read=false&severity=critical`) |
| PATCH | `/api/alerts/{id}/read` | Yes | Mark as read |
| POST | `/api/alerts/read-all` | Yes | Mark all as read |

### Alert Types

| Type | Trigger | Severity |
|---|---|---|
| `deploy_error` | Vercel/Railway deploy failed | critical |
| `deploy_success` | Deploy succeeded | success |
| `error_rate_high` | Error rate > 5% | critical |
| `traffic_spike` | Traffic > 200% baseline | warning |
| `traffic_drop` | Traffic < 50% baseline | warning |
| `sns_viral` | Post > 10x avg engagement | info |
| `scheduled_post_failed` | Scheduled post publish failed | warning |
| `market_urgent` | Urgent market insight | warning |
| `token_expiring` | OAuth token expiry < 24h | warning |
| `system` | System notification | info |

Severity: `critical`, `warning`, `info`, `success`

---

## 11. Webhooks (Incoming)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/webhooks/github` | Signature | GitHub events |
| POST | `/api/webhooks/vercel` | Signature | Vercel deployment events |
| POST | `/api/webhooks/railway` | None | Railway deployment events |

### GitHub Webhook Events

- `deployment_status`: Creates deployment log + alert on failure
- Verified with `X-Hub-Signature-256` header (HMAC-SHA256)

### Vercel Webhook Events

- `deployment.created`: Log as building
- `deployment.succeeded`: Log as ready + success alert
- `deployment.error`: Log as error + critical alert

### Railway Webhook Events

- `SUCCESS`, `FAILED`, `CRASHED`, `BUILDING`, `DEPLOYING`
- Failed/crashed creates critical alert

---

## 12. Background Workers

| Task | Interval | Description |
|---|---|---|
| `sync_sns_metrics` | 30 min | Pull X/Threads metrics for published posts |
| `publish_scheduled_posts` | 5 min | Publish posts past their scheduled time |
| `refresh_expiring_tokens` | 1 hour | Refresh OAuth tokens expiring within 24h |

Workers run via APScheduler, started on app lifespan startup.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | For system operations |
| `SUPABASE_JWT_SECRET` | Yes | JWT verification |
| `GEMINI_API_KEY` | Yes | Google AI |
| `FRONTEND_URL` | Yes | CORS origin |
| `BACKEND_URL` | Yes | OAuth callback base |
| `ENCRYPTION_KEY` | Yes | Fernet key for token encryption |
| `X_CLIENT_ID` | Optional | X OAuth |
| `X_CLIENT_SECRET` | Optional | X OAuth |
| `THREADS_APP_ID` | Optional | Threads OAuth |
| `THREADS_CLIENT_SECRET` | Optional | Threads OAuth |
| `GITHUB_CLIENT_ID` | Optional | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth |
| `GITHUB_WEBHOOK_SECRET` | Optional | Webhook signature verification |
| `VERCEL_TOKEN` | Optional | Vercel API access |
| `VERCEL_WEBHOOK_SECRET` | Optional | Webhook verification |
| `RAILWAY_TOKEN` | Optional | Railway API access |
