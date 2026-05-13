# LaunchPad Design System

## Overview

LaunchPad is a SaaS dashboard for indie product builders. The design is clean, professional, and data-driven. White-dominant surfaces with slate text, glass-effect cards, and shadow-based depth instead of borders. Pretendard Variable as the system font for sharp Korean/English rendering.

The UI must never feel static or stiff. Every state change carries motion. Every interactive surface responds to the user.

---

## Color Palette

### Light Mode (Primary)

| Token | Value | Usage |
|---|---|---|
| `--background` | `oklch(0.99 0.002 250)` | Page background, warm near-white |
| `--foreground` | `oklch(0.27 0.01 250)` | Primary text, slate-800 tone |
| `--card` | `oklch(1 0 0)` | Card surfaces, pure white |
| `--border` | `oklch(0.95 0 0)` | Extremely subtle, shadow-first approach |
| `--sidebar` | `oklch(0.99 0.002 250 / 0.7)` | Glassmorphism sidebar |
| `--primary` | `oklch(0.205 0 0)` | CTA buttons, slate-900 |
| `--muted-foreground` | `oklch(0.556 0 0)` | Secondary text, labels |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Error states |

### Semantic Colors

| Purpose | Color | Usage |
|---|---|---|
| Success | `emerald-500/600` | Resolved issues, healthy services, positive changes |
| Warning | `amber-500/600` | Investigating issues, degraded services |
| Critical | `red-500/600` | Open critical issues, deploy failures |
| Info | `blue-500/600` | Promotion events, informational badges |
| Accent | `violet-500/600` | Deployment events, chart highlights |

### Dark Mode

Follows shadcn defaults. Sidebar uses `oklch(0.145 0 0 / 0.8)` with glassmorphism.

---

## Typography

**Font Stack:** Pretendard Variable (CDN loaded), system fallbacks.

```css
--font-sans: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
```

### Scale (8-point aligned)

| Class | Size | Weight | Tracking | Usage |
|---|---|---|---|---|
| `.h-display` | clamp(32-48px) | 800 | -0.04em | Hero headlines |
| `.h-title` | clamp(20-24px) | 700 | -0.03em | Section headers |
| `.h-eyebrow` | 10px | 700 | 0.1em, uppercase | Category labels |
| `.text-lede` | 16px | 400 | normal | Lead paragraphs |
| `.metric-value` | 24-32px | 900 | tighter | Dashboard metric numbers |
| `.metric-label` | 10px | 700 | 0.08em, uppercase | Metric labels |
| Body | 13-14px | 400-500 | normal | Default text |

### Numeric Display

`font-variant-numeric: tabular-nums` on all metric values. Numbers must column-align in tables and during counter animations.

---

## Layout

### Spacing (8-point grid)

| Token | Value | Usage |
|---|---|---|
| Card padding | `p-6` to `p-8` (24-32px) | Inside glass cards |
| Card gap | `gap-5` (20px) | Between cards in grids |
| Section gap | `space-y-12` (48px) | Between major sections |
| Page padding | `px-6 py-8` | Page margins |
| Max width | `max-w-5xl` (1024px) | Content constraint |

### Surface Hierarchy (Shadow-First)

No borders between sections. Depth is communicated through shadow and surface color.

```css
.glass-card {
  background: white/70;
  backdrop-blur: xl;
  border-radius: 24px;
  border: 1px solid oklch(0 0 0 / 0.03);
  box-shadow: 0 4px 20px -4px oklch(0 0 0 / 0.03), 0 0 0 1px oklch(1 1 1 / 0.5) inset;
}
.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px -6px oklch(0 0 0 / 0.06), 0 0 0 1px oklch(1 1 1 / 0.8) inset;
}
```

### Sidebar

- Width: 240px (`w-60`)
- Background: glassmorphism (`bg-sidebar` with 0.7 opacity + backdrop-blur)
- Separation: `shadow-sidebar` (no border line)
- Border between sidebar and content: never a line. Always shadow.

### Border Radius

| Surface | Radius | Usage |
|---|---|---|
| Cards, panels | `rounded-[24px]` | Main content cards |
| Nested cards | `rounded-[20px]` | Cards inside cards |
| Buttons | `rounded-full` | Primary CTA |
| Inputs | `rounded-lg` | Form inputs |
| Badges | `rounded-md` | Status badges |

---

## Motion System

Motion is a first-class design language. Every state change carries a corresponding motion. A button that opens a panel without animation asks the user to figure out that a panel appeared. We never do that.

### Principles

1. **Motion is informative, not decorative.** Every animation answers "where did this come from", "what just changed", "is the system still working". If it does not answer one, it should not exist.
2. **Motion is fast.** Default duration is 200ms. Long-form transitions cap at 480ms. Motion never becomes a wait.
3. **Motion uses standard easings, named not numeric.** Four easing tokens. Never inline a cubic-bezier in component code.
4. **Motion respects `prefers-reduced-motion`.** Reduced-motion fallback is instant transition with only a 100ms opacity fade.
5. **Motion never blocks input.** A user can click during a motion and the click is honoured immediately.

### Easing Tokens

| Token | Curve | Use |
|---|---|---|
| `ease.standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default. Opacity, surface lift, position changes from user input. |
| `ease.emphasised` | `cubic-bezier(0.3, 0, 0, 1.2)` | Slight overshoot. Panels sliding in, modals opening. |
| `ease.decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Elements arriving on screen, no overshoot. |
| `ease.accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving the screen. Dismissal, exit. |

### Duration Tokens

| Token | Value | Use |
|---|---|---|
| `duration.instant` | 0ms | Reduced-motion fallback |
| `duration.quick` | 120ms | Hover lift, button press, chip toggles |
| `duration.base` | 200ms | Default for all state changes |
| `duration.relaxed` | 320ms | Panel slide-in, modal open |
| `duration.slow` | 480ms | Page-level transitions |
| `duration.deliberate` | 800ms | Hero entrance (single-fire on page load) |

### Standard Motions

**`motion.fade-in`** -- opacity 0 -> 1, 200ms, `ease.standard`. Elements appearing in place.

**`motion.fade-out`** -- opacity 1 -> 0, 120ms, `ease.accelerate`. Faster than fade-in.

**`motion.slide-in-from-right`** -- translateX(100%) -> 0, opacity 0 -> 1, 320ms, `ease.emphasised`. Drawers, side panels.

**`motion.slide-in-from-bottom`** -- translateY(8px) -> 0, opacity 0 -> 1, 200ms, `ease.decelerate`. Toasts, new list items, alerts.

**`motion.lift-on-hover`** -- Background lifts one surface step, 120ms, `ease.standard`. No transform. Purely colour-based. Every hoverable card and list row.

**`motion.press-down`** -- scale(0.96), 120ms press, 200ms release with overshoot. Every primary and secondary button.

**`motion.expand-accordion`** -- height auto, opacity 0 -> 1, 200ms, `ease.decelerate`. Expandable sections.

**`motion.page-stagger`** -- Cards stagger in from opacity 0, translateY(14px), `staggerChildren: 0.06`, 400ms per item. Every page load.

### State Transitions

| Transition | Change | Duration | Easing |
|---|---|---|---|
| Default -> Hover | Surface lifts one step | 120ms | `ease.standard` |
| Hover -> Active | Surface to pressed, scale 0.96 | 120ms | `ease.standard` |
| Active -> Default | Surface returns, scale 1 | 200ms | `ease.emphasised` (overshoot) |
| Default -> Focus | 4px glow ring | 120ms | `ease.standard` |
| Default -> Disabled | Opacity 0.4 | 200ms | `ease.standard` |

### View Transitions

**Project card click (home -> dashboard):**
1. Card scales to 1.02 (0-120ms)
2. Page content fades out (120-320ms)
3. New page fades in with stagger (320-640ms)

**Modal opening:**
Backdrop fades in (0-200ms). Modal scales 0.96 -> 1, opacity 0 -> 1 (200-400ms). Backdrop blur 0 -> 8px.

**Tab switching:**
Content exits: opacity fade + translateY(-8px), 120ms. New content enters: opacity + translateY(8px -> 0), 200ms. `AnimatePresence mode="wait"`.

### Micro-interactions

**Chart data point hover:** Circle scales 3.5px -> 5px. Tooltip fades in from below (200ms). Vertical guide line at 0.04 opacity.

**Metric counter on page load:** Numbers count up from 0, 800ms, `ease.decelerate`, `tabular-nums`.

**Notification badge increment:** Scale 1 -> 1.2 -> 1, 300ms spring. Only on increment.

**Status dot (degraded/running only):** Opacity 1 -> 0.4 -> 1, 2s infinite. No pulsing for normal states.

**Card hover lift:** Background lighter, shadow grows, translateY(-2px), 120ms. Reversible.

**Button press:** scale(0.96) mousedown, scale(1) with overshoot mouseup. Background darkens during press.

**Toast notification:** Slides from bottom with 8px offset + overshoot. 4s (success) / 6s (error). Exit: fade-out + 8px drift down.

**Copy-to-clipboard:** Icon morphs copy -> checkmark, 120ms. "Copied" for 800ms. Morphs back.

---

## Interaction Patterns

### Hover, Press, Focus, Selection

| State | Visual |
|---|---|
| Default | Surface at resting level |
| Hover | One surface step up, subtle shadow growth |
| Press | Surface pressed, scale 0.96 |
| Focus | 4px accent glow ring |
| Selected | 1px accent border |
| Disabled | Opacity 0.4, cursor not-allowed |

### Loading States

- Skeletons matching content layout, surface-2 color
- Subtle shimmer (background-position, 1.5s linear infinite)
- Never empty white space while loading
- Stagger skeleton appearance (0.06s per item)

### Empty States

- Centered icon (0.3 opacity) + text + CTA
- No illustrations. Minimal.
- Primary CTA for main action

### Error States

- Red-tinted card with humanized error message
- "Retry" button always available
- Never raw backend errors

---

## Implementation

### Libraries

| Library | Usage |
|---|---|
| `motion/react` (Framer Motion) | All animations, page transitions, gestures |
| `tailwindcss v4` | Utility styling |
| `shadcn/ui` | Base UI primitives |
| `lucide-react` | Icons |
| `next-themes` | Dark/light mode |
| `Pretendard Variable` | System font (CDN) |

### Motion Code Patterns

```tsx
// Page-level stagger
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};
```

```tsx
// Button press
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.96 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
/>
```

```tsx
// Modal
<AnimatePresence>
  {isOpen && (
    <>
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      />
    </>
  )}
</AnimatePresence>
```

```tsx
// Tab switch
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
  />
</AnimatePresence>
```

### Reduced Motion

```tsx
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

<motion.div
  initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
/>
```

---

Version: 1.0
Last Updated: 2026-05-14
