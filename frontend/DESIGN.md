# Design System — Indie Product Hub

## 디자인 방향

데이터 중심의 인디 제품 대시보드. 딥 네이비 사이드바 + 퍼플 포인트 컬러 + 밝고 청결한 콘텐츠 영역의 조합으로 전문적이고 생동감 있는 분석 대시보드 느낌을 목표로 한다.

```
┌──────────────────┬─────────────────────────────────────────┐
│  딥 네이비       │  흰색 / 연한 블루-그레이 배경           │
│  사이드바        │                                         │
│                  │  ┌──────┐ ┌──────┐ ┌──────┐           │
│  ● Dashboard     │  │ 지표 │ │ 지표 │ │ 지표 │  ← 컬러   │
│  ● Key Metrics   │  │ 카드 │ │ 카드 │ │ 카드 │    틴트   │
│                  │  └──────┘ └──────┘ └──────┘           │
│  Analytics ▾     │                                         │
│    All analytics │  ████ 차트 (퍼플 그라디언트)           │
│    Favorites     │                                         │
│    New analytics │  ─────────────────────────────────     │
│                  │  테이블  ● Completed ● Pending          │
└──────────────────┴─────────────────────────────────────────┘
```

---

## Stack

| 항목 | 사용 기술 |
|------|-----------|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS v4 |
| UI Primitives | shadcn/ui (base-ui 기반) |
| Animation | motion/react (Framer Motion) |
| Font | Geist Sans / Geist Mono |
| Icon | lucide-react |

---

## Color Palette

### Brand Colors

| 이름 | Hex | oklch | 용도 |
|------|-----|-------|------|
| **Indigo 950** | `#1a1f4b` | `oklch(0.22 0.12 264)` | 사이드바 배경 |
| **Violet 600** | `#7c3aed` | `oklch(0.52 0.24 278)` | 프라이머리 액션, 활성 상태 |
| **Violet 400** | `#a78bfa` | `oklch(0.72 0.16 278)` | 차트 보조, 호버 |
| **Violet 100** | `#ede9fe` | `oklch(0.95 0.04 278)` | 카드 틴트, 배지 배경 |

### Semantic Tokens (globals.css 추가 필요)

```css
:root {
  /* Brand */
  --primary:          oklch(0.52 0.24 278);   /* violet-600 */
  --primary-foreground: oklch(0.985 0 0);
  --primary-muted:    oklch(0.95 0.04 278);   /* violet-100 */

  /* Sidebar */
  --sidebar:          oklch(0.22 0.12 264);   /* indigo-950 */
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-accent:   oklch(0.30 0.10 264);   /* 활성 메뉴 */
  --sidebar-muted:    oklch(0.985 0 0 / 0.45);

  /* Content area */
  --background:       oklch(0.97 0.01 260);   /* 연한 blue-gray */
  --card:             oklch(1 0 0);
  --card-foreground:  oklch(0.145 0 0);
  --border:           oklch(0.92 0.01 260);

  /* Status */
  --status-success:   oklch(0.65 0.17 145);   /* emerald */
  --status-warning:   oklch(0.75 0.15 70);    /* amber */
  --status-danger:    oklch(0.60 0.22 25);    /* red */
}
```

### 메트릭 카드 컬러 틴트

각 지표 카드는 고유한 컬러 틴트를 가진다.

```
총 노출 / 매출    →  bg: oklch(0.97 0.04 145)   sparkline: emerald
클릭 / 주문       →  bg: oklch(0.97 0.04 25)    sparkline: red/orange
방문자 / 고객     →  bg: oklch(0.97 0.04 230)    sparkline: blue/violet
전환율            →  bg: oklch(0.97 0.04 278)    sparkline: violet
```

### 상태 색상

```
● Completed   bg-emerald-100  text-emerald-700   dot: emerald-500
● Pending     bg-amber-100    text-amber-700     dot: amber-500
● Canceled    bg-red-100      text-red-700       dot: red-500
```

---

## Typography

### Scale

| 클래스 | 크기 | Weight | 용도 |
|--------|------|--------|------|
| `.h-display` | clamp(28–56px) | 700 | 히어로 헤드라인 |
| `.h-title` | clamp(22–36px) | 600 | 섹션 타이틀 |
| `.h-eyebrow` | 11px, tracking 0.14em | 500 | 섹션 레이블 (대문자) |
| `text-2xl font-bold` | 24px | 700 | 페이지 제목 |
| `text-3xl font-bold` | 30px | 700 | 지표 숫자 (MetricCard) |
| `text-sm` | 14px | 400/500 | 본문, 테이블 셀 |
| `text-xs` | 12px | 400/500 | 보조, 레이블, 배지 |

### 숫자 강조

```jsx
<p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
```

`tabular-nums` — 숫자가 변할 때 레이아웃 흔들림 방지.

---

## Layout

### 전체 구조

```
┌─── w-64 ───┬──────────── flex-1 ────────────┐
│  Sidebar   │  <main>                        │
│  (fixed)   │    <Header />     h-16         │
│            │    ─────────────────────────   │
│            │    <Content>      p-6 ~ p-8    │
│            │      max-w-6xl mx-auto         │
│            │    </Content>                  │
└────────────┴────────────────────────────────┘
```

- 사이드바: `w-64`, `fixed` 또는 `sticky top-0 h-dvh`
- 콘텐츠 최대 너비: `max-w-6xl` (1152px) — 대시보드는 더 넓게
- 페이지 패딩: `p-6` (24px)
- 카드 간격: `gap-4` (16px) — 기존 gap-10보다 조밀하게
- 카드 패딩: `p-5` 또는 `p-6`

### 그리드

```jsx
/* 지표 카드 — 3열 */
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

/* 대시보드 — 메인 + 사이드 */
<div className="grid grid-cols-3 gap-4">
  <div className="col-span-2">...</div>   {/* 차트 */}
  <div className="col-span-1">...</div>   {/* 보조 위젯 */}
</div>
```

---

## Components

### Sidebar

딥 네이비 배경. 로고 → 메뉴 그룹 → 하단 프로필 순서.

```
bg-[--sidebar]  text-[--sidebar-foreground]  w-64  h-dvh  sticky top-0

┌──────────────────────┐
│  ◉ Logo  AppName     │  ← 로고 + 앱명, p-5
├──────────────────────┤
│  ⊞ Dashboard      ✓ │  ← 활성: bg-[--sidebar-accent] rounded-lg
│  📊 Key Metrics      │
├──────────────────────┤
│  Analytics        ▾  │  ← 그룹 헤더, text-[--sidebar-muted]
│    • All analytics   │  ← 들여쓰기 pl-8
│    • Favorites       │
│    • New analytics   │
├──────────────────────┤
│  Documents        ▾  │
│  Notification   26   │  ← 배지: bg-primary rounded-full px-2
├──────────────────────┤
│  [avatar] Name       │  ← 하단 고정, border-t border-white/10
│           email →    │
└──────────────────────┘
```

```jsx
// 활성 메뉴 아이템
"bg-[var(--sidebar-accent)] text-white rounded-lg font-medium"

// 비활성 메뉴 아이템
"text-white/60 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
```

### Header (콘텐츠 영역 상단)

```
┌─────────────────────────────────────────────────────┐
│  Page Title         [🔍 Search...]  [🔔] [⚙ avatar] │
└─────────────────────────────────────────────────────┘
```

```jsx
<header className="flex items-center justify-between h-16 px-6 bg-card border-b border-border">
  <h1 className="text-xl font-bold tracking-tight">페이지 제목</h1>
  <div className="flex items-center gap-3">
    {/* SearchBar, NotifBell, Avatar */}
  </div>
</header>
```

### Tab Navigation (필터 탭)

언더라인 스타일. 배경 없이 보더-바텀으로 활성 표시.

```
  ─────────────────────────────────────────
  ● Value comparison  % Average  ⚙ Config  ▼ Filter
  ════════════                              ← 퍼플 언더라인
  ─────────────────────────────────────────
```

```jsx
<div className="flex gap-6 border-b border-border">
  {tabs.map(tab => (
    <button
      key={tab.id}
      className={cn(
        "flex items-center gap-1.5 pb-3 text-sm font-medium transition-colors",
        active === tab.id
          ? "border-b-2 border-primary text-primary -mb-px"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <tab.icon className="w-3.5 h-3.5" />
      {tab.label}
    </button>
  ))}
</div>
```

### MetricCard (지표 카드)

컬러 틴트 배경 + 스파크라인 차트 조합.

```
┌──────────────────────────────────┐
│  Total sales          ∿∿∿∿∿∿∿   │  ← sparkline (우측)
│  $59,690                         │
│  Since last week  ↑ 13.4%        │
└──────────────────────────────────┘
bg: 해당 카드 틴트 컬러, rounded-xl, p-5, shadow-sm
```

```jsx
function MetricCard({ label, value, change, positive, tint, children }) {
  return (
    <div className={cn("rounded-xl p-5 shadow-sm", tint)}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="w-20 h-10">{children /* sparkline */}</div>
      </div>
      <p className="text-3xl font-bold tracking-tight tabular-nums mt-2">{value}</p>
      <div className="flex items-center gap-1 mt-1 text-xs">
        <span className="text-muted-foreground">Since last week</span>
        <span className={positive ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
          {change}
        </span>
      </div>
    </div>
  );
}
```

### Chart Card

```
┌──────────────────────────────────────┐
│  Sales Report   12M  6M  30D  7D  ↓ ···│
│                                      │
│  Avg. per month                      │
│  $38,500  ▲                          │
│                                      │
│  ┄ Median $45,000                    │
│                                      │
│  ▁▂▃▄▂▅▃▆▇▅▇▄                       │  ← 퍼플 그라디언트 바
│  Jan Feb Mar Apr ...                 │
└──────────────────────────────────────┘
bg-card, rounded-xl, p-5, shadow-sm
```

**차트 색상:**
```
바 (기본):   oklch(0.52 0.24 278 / 0.2)   /* violet/20 */
바 (활성):   oklch(0.52 0.24 278)          /* violet solid */
라인:        oklch(0.52 0.24 278)
라인 채움:   linear-gradient(violet/20 → transparent)
```

**기간 필터 탭:**
```jsx
<div className="flex gap-1 p-1 bg-muted rounded-lg">
  {["12 Months","6 Months","30 Days","7 Days"].map(p => (
    <button className={active === p
      ? "bg-card shadow-sm text-foreground rounded-md px-3 py-1 text-xs font-medium"
      : "text-muted-foreground px-3 py-1 text-xs"
    }>{p}</button>
  ))}
</div>
```

### Data Table

```
┌──────┬───────────┬─────────┬────────┬──────────┬────────┬────────────┐
│  #   │ Customer  │ Order   │  Cost  │ Due Date │ Rating │ Status     │
├──────┼───────────┼─────────┼────────┼──────────┼────────┼────────────┤
│  1   │ [●] John  │ #5845-12│ $97.50 │ 7 Feb    │ ★★★★★  │ ● Completed│
│  2   │ [●] Matt  │ #4734-01│ $79.90 │ 6 Feb    │ ★★★★☆  │ ● Pending  │
│  3   │ [●] Dont  │ #6959-26│ $80.40 │ 5 Feb    │ ★★★☆☆  │ ● Canceled │
└──────┴───────────┴─────────┴────────┴──────────┴────────┴────────────┘
```

```jsx
// 헤더
<th className="text-xs font-medium text-muted-foreground pb-3 text-left">

// 링크 스타일 주문번호
<td className="text-sm text-primary font-medium hover:underline cursor-pointer">

// 상태 배지
const statusStyle = {
  completed: "bg-emerald-100 text-emerald-700",
  pending:   "bg-amber-100  text-amber-700",
  canceled:  "bg-red-100    text-red-700",
};
<span className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit", statusStyle[status])}>
  <span className="w-1.5 h-1.5 rounded-full bg-current" />
  {label}
</span>
```

### Widget Card (우측 사이드)

```
┌──────────────────────┐
│  Orders List  ↓  ··· │
│                      │
│  ████ ████           │  ← 스택 바 차트
│  ████ ████           │
│  Jan   Feb           │
│                      │
│  ● 10%  ● 20%  ● 40% │  ← 범례
└──────────────────────┘
```

---

## Border Radius

| 용도 | 클래스 | 값 |
|------|--------|-----|
| 카드, 패널 | `rounded-xl` | 12px |
| 버튼, 인풋 | `rounded-lg` | 8px |
| 배지, 태그 | `rounded-full` | 999px |
| 아바타 | `rounded-full` | 999px |
| 탭 내부 버튼 | `rounded-md` | 6px |

---

## Shadow

```
카드:     shadow-sm   (0 1px 3px rgba(0,0,0,0.08))
호버 카드: shadow-md  (0 4px 12px rgba(0,0,0,0.12))
사이드바: shadow-xl   (딥 네이비라 불필요할 수도)
```

---

## Animation

### Easing

```ts
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
```

### 페이지 진입 (Stagger + FadeUp)

```ts
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
};
```

### 탭 전환

```jsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
  />
</AnimatePresence>
```

### 숫자 카운트 업

```jsx
// motion/react useMotionValue + useTransform 또는 외부 라이브러리
// 지표 카드의 숫자는 페이지 진입 시 0 → 목표값으로 카운트업
```

### 바 차트 진입

```jsx
initial={{ scaleY: 0, originY: 1 }}
animate={{ scaleY: 1 }}
transition={{ delay: 0.3 + i * 0.06, duration: 0.5, ease: EASE_OUT_EXPO }}
```

---

## Spacing Tokens

| 용도 | 값 |
|------|----|
| 페이지 패딩 | `p-6` (24px) |
| 카드 패딩 | `p-5` (20px) |
| 카드 간격 | `gap-4` (16px) |
| 섹션 간격 | `gap-6` (24px) |
| 인라인 아이템 간격 | `gap-2` ~ `gap-3` |
| 사이드바 너비 | `w-64` (256px) |
| 헤더 높이 | `h-16` (64px) |

---

## Onboarding (기존 유지)

온보딩은 별도 레이어. 브랜드 색상 그라디언트 메쉬 배경.

- `.onboard-shell` — fixed 전체화면, 중앙 정렬
- `.onboard-mesh` — 블러 그라디언트 배경 (40s drift 애니메이션)
- `.onboard-grain` — SVG 노이즈 오버레이
- `.input-hero` — 52px, backdrop-filter blur(8px)
- `.btn-hero` — 48px 알약형, spring hover
- `.stepper-dot` — 활성: 32px / 비활성: 12px

---

## 다크모드

`ThemeProvider`로 class 기반. `dark:` variant 사용.  
사이드바는 이미 어두운 네이비이므로 다크모드에서도 거의 동일하게 유지.  
콘텐츠 영역만 `dark:bg-[oklch(0.12 0.02 264)]` 정도로 전환.

```css
@custom-variant dark (&:is(.dark *));
```
