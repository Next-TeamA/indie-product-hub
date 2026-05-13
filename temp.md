# Scene24 Design System

> AI-driven cinematic ad generation workbench.
> Last updated 2026-05-14. Authoring source: design.md
> Owner: Scene24 design (Seongmin Lee)

---

## Table of Contents

1. Design Philosophy
2. Anti-Patterns (the AI look we refuse)
3. Brand Atmosphere
4. Dual Canvas System (Studio Dark and Paper Light)
5. Color Tokens
6. Typography
7. Spacing and Layout
8. Border Radius and Shape
9. Elevation and Depth
10. Iconography
11. Motion System
12. Interaction Patterns
13. Component Library
14. Page Layouts
15. Long-Running Task UX (20-minute rendering)
16. Realtime Streaming Document Pattern (Claude-style)
17. Editor Composition Pattern (Figma-style inspector + chat)
18. Auth Flow (Google, Apple, GitHub)
19. Internationalization (Korean and English)
20. Responsive Behavior
21. Accessibility
22. Implementation Guide
23. Token Reference Sheet

---

## 1. Design Philosophy

Scene24 makes cinematic ads. The product is a video. The interface exists to give the video a stage, not compete with it. Every design decision flows from one core observation: the user is here to watch their work happen and then ship it. They are not here to look at our UI.

Three principles structure the entire system.

**Principle 1: The canvas is the protagonist.**
The editor's primary surface is a warm near-black, sized to give a video preview maximum visual weight. UI chrome compresses to the edges, fades in only when interaction is invited, and never decorates. When the user enters the editor we want them to feel they have walked into a screening room, not a dashboard.

**Principle 2: Generation is an event the user can witness.**
A Scene24 generation takes fifteen to twenty minutes because the agent self-critiques, re-renders, and iterates. We refuse to hide this in a spinner. The generation surface streams the agent's thoughts, tool calls, and intermediate outputs in real time. A line of reasoning arrives, a tool call expands inline, a frame thumbnail materialises, a document slides in from the right when it finishes writing. The user gets the documentary, not the black box.

**Principle 3: Editing is dialogue plus direct manipulation.**
Two interaction modes coexist as equals. The chat panel handles intent ("make the hook punchier", "this beat feels slow"). The canvas handles precision ("move this exact word ten pixels left, change this exact font weight to 500"). A user should never feel forced into either mode. Selecting an object on the canvas pre-populates the chat with that object as context. Asking the chat to modify something opens the inspector to the changed parameter.

These principles compound. The canvas-first stance makes the video important; the event-witnessing stance makes the long render bearable; the dialogue stance makes the editing feel like collaboration.

---

## 2. Anti-Patterns (the AI look we refuse)

This section lists what Scene24 will not look like. It is more important than the affirmative spec because the AI product category has converged on a small set of visual cliches that we must actively resist.

**No translucent gradient cards.** The "frosted glass with a faint cyan-to-magenta gradient" pattern that has come to define AI startup landing pages is banned. Surfaces are solid. Translucency exists only in two precisely scoped places: the editor's floating panel backdrop blur (function: see through to the canvas behind), and the chat input's keyboard-focus ring shadow (function: focus signal).

**No "live" pulsing dots.** The animated coloured dot with a "Live" or "AI" label next to it is banned. Status communication uses typographic labels and surface lift, not pulsing chromatic indicators.

**No rainbow gradients.** No CSS gradient combines more than two analogous warm hues. There is exactly one decorative gradient in the system (the auth screen ambient wash) and it is so subtle the user reads it as paper rather than as colour.

**No emoji anywhere in the product UI.** All glyphs are custom SVG icons from a single stroke family. Emoji are a marketing language; we are not building a chat toy.

**No "AI sparkle" iconography.** The four-point star, the magic wand, the sparkles emoji rendered as a glyph - all banned. The agent's identity is communicated through quiet typographic restraint and through the quality of its outputs, not through an icon that announces it is an AI.

**No arbitrary divider lines.** Horizontal rules between nav and content, between sidebar and main, between a label and the field it labels - all banned. Hierarchy is carried by spacing, weight, and surface lift. A divider line is only acceptable inside dense list rows where typographic rhythm alone cannot create a row boundary.

**No drop shadows on cards.** Surfaces lift through colour, not shadow. The single exception is the editor's floating sticky toolbar over the video preview, which uses a soft warm-toned shadow because it floats over live moving content.

**No skeuomorphic generation animation.** No spinning loader replacing the canvas. No "AI is thinking" with three pulsing dots. The wait is filled with the actual work, streamed.

**No "drag and drop your video" empty state with a giant cloud icon.** Empty states use typography and a single quiet action button, never a hero illustration that screams "this is where you put files."

---

## 3. Brand Atmosphere

Scene24 reads like a director's studio. The product is competent, calm, and a little bit cinematic in temperament. The chrome stays out of the way; the video imagery is allowed to be the star. When the user looks at the dashboard or landing surface, the warmth of the cream canvas signals craft and care. When the user enters the editor, the studio darkness signals focus.

Two cultural touchstones inform the language:

- Apple's reverence for the artefact (the product takes the stage, UI recedes).
- A film colourist's grading bay (warm darks, neutral chrome, single accent reserved for marking decisions).

The result is a system that feels neither corporate-SaaS nor consumer-AI-toy. It feels like a tool a working creative would expect to use.

### 3.1 Brand Identity - Wordmark and Mark

Scene24's brand has two pieces: a wordmark (the text "Scene24") and a mark (a single SVG glyph). They appear together in the top nav and footer; the mark also appears alone in compact contexts (favicon, browser tab, app icon, mobile collapsed nav).

**The mark:**
A six-pointed asterisk-style glyph. The construction is six strokes radiating from a single point at 60-degree intervals, each stroke terminating in a rounded cap. The mark reads as a stylised camera iris, a director's marker, or a clock face at a deliberately ambiguous read. Drawn in 24x24 viewBox with 1.5px stroke at base size; scales proportionally.

Mark fill rules:
- On Paper Light surfaces: stroke `paper.ink` with one stroke (the topmost) tinted to `accent.copper`. The copper-tipped stroke is a quiet brand signature.
- On Studio Dark surfaces: stroke `studio.ink` with one stroke tinted to `accent.copper-on-dark`.
- As favicon/app icon: solid copper fill on a circular cream background (the favicon is the only place the mark uses a filled shape).

**The wordmark - typeface decision:**

The wordmark uses **Syne** (weight 700 or 800), a typeface specifically chosen because it is unambiguously not the body font. Using the same typeface for the wordmark and the UI body is the most common branding mistake we are avoiding - it makes the wordmark forgettable.

Why Syne specifically:
- Distinctive geometric character with slight asymmetric warmth - reads as "designed" rather than "typeset"
- Production usage in cultural and film-related contexts validates the cinematic adjacency
- Open source under SIL Open Font License, available on Google Fonts
- Variable axis for fine weight tuning
- Renders the numerals "24" cleanly - the "2" has a confident curved counter and the "4" has a strong diagonal that mirrors the camera-iris geometry of the mark
- Unmistakable on first read - users will remember the wordmark shape

Wordmark typography spec:
- Family: `Syne Variable`, fallback `Syne`, fallback `Geist Sans Variable` (so the wordmark degrades gracefully)
- Weight: 700 (Bold) for default; 800 (ExtraBold) when the wordmark needs to assert against a complex hero photography backdrop
- Letter spacing: `-0.015em` (-1.5%). Syne is drawn with snug spacing by default, so the negative tracking is modest.
- Font feature: `"ss01" 1` enables alternate forms that pair better at display sizes
- Colour: `paper.ink` on Paper Light; `studio.ink` on Studio Dark. The mark next to the wordmark is `accent.copper` and is what carries the brand colour - the wordmark itself is monochrome ink.

Wordmark size scale:
- Top nav (marketing): 22px (Syne 700, -1.5%)
- Top nav (app): 20px (Syne 700, -1.5%)
- Hero (landing page above-fold): 32px (Syne 800, -2%)
- Footer: 18px (Syne 700, -1.5%)
- Loading screen / splash: 56px (Syne 800, -2%)
- Mobile collapsed nav: 18px (Syne 700, -1.5%)

Wordmark + mark composition:
```
+----+ +-----------+
| ●  | | Scene24   |
+----+ +-----------+
  ^          ^
  16-32px    22-56px
  mark       wordmark
```

The mark sits to the left of the wordmark. Gap between mark and wordmark equals 50% of the mark's width (8px when mark is 16px, 12px when mark is 24px). The mark and wordmark vertically centre-align - the mark's vertical centre matches the wordmark's optical centre (which sits slightly below the wordmark's geometric centre due to Syne's metrics).

The "24" in Scene24:
The digits "24" carry meaning - 24 frames per second is the cinematic standard. We do not stylise the "24" differently from the "Scene" portion in the default wordmark. There is one exception: on the loading screen and on the about-page hero, the "24" can render in `accent.copper` while "Scene" stays in ink. This is the wordmark's "anniversary" form - used at most twice in the product.

Wordmark rules:
- Never use the wordmark in a colour other than ink (with the single exception above).
- Never use a different typeface for the wordmark. If Syne fails to load, fallback to Geist Sans Variable weight 700 - this is acceptable degradation, not a styling choice.
- Never apply text effects (underline, strikethrough, italic) to the wordmark.
- Never separate the mark and wordmark with a divider line or dot.
- The mark can appear alone (favicon, app icon, splash) but the wordmark never appears alone in product chrome - it always carries the mark.

### 3.2 Brand Colour Rationale - How We Picked the Palette

This subsection documents the reasoning behind the colour choices because brand colour decisions get challenged repeatedly and the rationale should outlive any individual reviewer.

**Why not pure white canvas:**
The AI startup category, top-to-bottom, ships pure white (`#ffffff`) canvases. ChatGPT, Cursor, Perplexity, Pika, Runway, ElevenLabs marketing, OpenAI marketing - all pure white. Shipping pure white locates us in that category. Cream (`#f7f5f0`) does three things at once: it removes us from the AI-cliche, it signals "considered tool" rather than "consumer chatbot", and it has been validated commercially by Anthropic (`#faf9f5`) and Lovable (`#f7f4ed`). Our cream is one step warmer than Anthropic's and one step cooler than Lovable's - a deliberate middle ground.

**Why not pure black canvas for the editor:**
Pure black (`#000000`) is harsh. Spending hours staring at pure black creates eye fatigue and the canvas reads as oppressive. Pure black also has no warmth differential against the video content (videos are warm-mid-tone on average), so the video does not visually pop against the canvas. Warm near-black (`#13110f`) sits cooler than typical video content, creating a temperature differential that makes the video read as the warm artefact and the canvas as the cool wall behind it. This is film colourist convention - grading bays are warm-near-black, not pure black, for exactly this reason.

**Why warm copper accent over cool blue or saturated coral:**
We considered five accent strategies before settling on copper:

1. *No accent* (Lovable's approach) - monochrome with no chromatic anchor. Considered and rejected because Scene24 needs a visible "this is the action" signal during a 20-minute generation, and surface lift alone cannot mark the playhead or the selected canvas object distinctively enough.

2. *Cool blue accent* (Linear, Vercel, Stripe) - corporate, trustworthy. Rejected because the entire technical SaaS category has converged here. Reads as "another developer tool".

3. *Saturated cyan or electric purple* (most AI products) - the "AI accent". Rejected explicitly to counter-position.

4. *Anthropic coral* (`#cc785c`) - warm, considered, distinctive. Strong choice. Rejected because it reads slightly under-saturated on dark surfaces (the editor primary surface), and because it is now identified with Anthropic.

5. *Copper amber* (`#c8744a`) - chosen. Same warm family as Anthropic coral but with more red-orange weight, which gives it stronger presence on dark surfaces. Reads as "golden hour cinema" and "film colourist's marking pen". Tested for accessibility contrast on both modes (Section 21.2) - passes WCAG AA on both Studio and Paper.

**Why one accent and not two:**
Two-accent systems require a rule about when each is used, and that rule is always violated by implementation in practice (designers reaching for the secondary accent because the layout needs more colour). One accent forces hierarchy by surface lift, which is harder to violate. Apple has done this for decades with one blue. We do it with one copper.

**Why semantic colours stay warm-family:**
Bright stop-light green (`#00cc00`) and pure red (`#ff0000`) would scream against the cream and warm-dark surfaces. They would read as alarms even when used for "completion" or "soft warning". We tune the semantic colours into the same warm family - the success green has yellow undertone, the error red has orange undertone, the warning amber sits adjacent to copper. The user still parses "this is a success state" because the contextual surface and icon do the heavy lifting; the colour is supporting cast, not screaming primary.

**Why Studio ink equals Paper canvas:**
The decision that `studio.ink` (`#f7f5f0`) is hex-identical to `paper.canvas` (`#f7f5f0`) is a brand-coherence move. When the user navigates from Dashboard (Paper Light) to Editor (Studio Dark), the colour they were reading text on (the cream canvas) becomes the colour they are now reading text in. The brand's defining cream is the constant across modes; only its role reverses. This makes the two modes feel like one brand expressed at different volumes rather than two separate themes.

---

## 4. Dual Canvas System

Scene24 ships two surface modes that share one design language. Surfaces are not toggled by the user; the mode is determined by the page's primary function.

### Studio Dark (default for the editor)

Used wherever the primary content is a video, an in-progress generation, or any live moving artefact. The canvas is a warm near-black that gives video imagery maximum visual lift without the harshness of pure black. The cooler-by-comparison tone of the video imagery against the warmth of the canvas creates a deliberate temperature differential the eye reads as "the video is the artefact, the canvas is the wall".

Pages: Editor, Generation Stream (full-screen), Player surfaces, the auth screen.

### Paper Light (default for marketing, dashboard, account, docs)

Used wherever the primary content is text, project lists, navigation, or branding. The canvas is a warm cream that signals craft. Used to make the product feel inhabited rather than corporate.

Pages: Landing, Pricing, Dashboard (projects list), Account, Settings, Docs.

### Switching Logic

A page is either Studio Dark or Paper Light. There is no hybrid surface. When the user navigates from Dashboard (Paper) to Editor (Studio), the transition uses a wipe motion - the cream canvas slides up and to the left while the studio canvas slides in from the bottom-right (see Section 11.6, View Transition - Mode Switch). The wipe takes 480ms and uses a steep ease-out so the destination canvas settles fast.

Within Studio Dark, panels (sidebar, inspector, chat) sit at one surface lift above the canvas using `surface-studio-1`. Within Paper Light, panels sit at one surface lift above using `surface-paper-1`. The lifts are minimal - around 4% luminosity step - because we never use shadow for hierarchy.

---

## 5. Color Tokens

The entire system is built from one base hue (warm near-black `#13110f`), its inverse (warm cream `#f7f5f0`), the lifts of each, a single accent (copper amber `#c8744a`), and three semantic tones. Every other "colour" you see anywhere in the system is one of these tokens at some opacity.

### 5.1 Studio Dark Tokens

| Token | Hex | Role |
|---|---|---|
| `studio.canvas` | `#13110f` | Editor canvas, generation stream background, auth screen |
| `studio.surface-1` | `#1a1816` | Panels (chat, inspector, sidebar) one lift above canvas |
| `studio.surface-2` | `#221f1c` | Cards inside panels, hovered list rows, beat thumbnails resting state |
| `studio.surface-3` | `#2b2823` | Featured pricing card on dark surfaces, the floating sticky toolbar |
| `studio.surface-pressed` | `#0e0d0b` | Pressed-state surface, slightly darker than canvas to indicate sunken |
| `studio.hairline` | `rgba(247, 245, 240, 0.06)` | The only acceptable hairline on dark - used inside dense list rows |
| `studio.hairline-strong` | `rgba(247, 245, 240, 0.12)` | Focused-input ring, selected pricing tier outline |
| `studio.ink` | `#f7f5f0` | All headline and primary body text on studio surfaces. Uses the same cream as the Paper canvas - this is deliberate. The ink on dark and the canvas on light are literally the same colour. The mode reverses; the brand is consistent. |
| `studio.ink-strong` | `#ffffff` | Reserved for the absolute strongest emphasis - the hero headline only. Use sparingly. |
| `studio.ink-muted` | `#a8a39a` | Secondary body, captions, deselected nav items |
| `studio.ink-faint` | `#6e6960` | Disabled text, micro-legal, footer fine-print |

### 5.1.1 Studio Dark - Revised Values (post-Claude differentiation)

Note: original values were `#13110f` warm near-black. Revised to `#0c0d0f` (slightly cooler dark) to differentiate from Anthropic Claude's warm-dark family, which uses similar warmth. The shift is a few luminosity points cooler but still well within "warm-dark" - we are not going Linear/Vercel cool-gray. The cooler tilt also gives video content (typically warm-mid-tone) stronger temperature contrast against the canvas.

| Token (revised) | Hex |
|---|---|
| `studio.canvas` | `#0c0d0f` |
| `studio.surface-1` | `#15161a` |
| `studio.surface-2` | `#1d1f24` |
| `studio.surface-3` | `#262830` |
| `studio.surface-pressed` | `#08090b` |

### 5.2 Paper Light Tokens - Revised for Claude Differentiation

The original `#f7f5f0` was too close to Anthropic Claude's `#faf9f5` cream. Both read as the same "warm parchment" and put Scene24 visually adjacent to Claude. We shift to a warmer, more saturated beige inspired by the Pumpkin×Charcoal palette - this differentiates clearly from Claude's neutral cream while remaining in the warm-natural family. The new tone reads as "directors-studio paper" rather than "AI-product cream".

| Token | Hex | Role |
|---|---|---|
| `paper.canvas` | `#f4ede0` | Landing, dashboard, account, marketing surfaces. Warmer beige than Claude cream. |
| `paper.surface-1` | `#ece4d4` | Project cards, panels lifted one step above canvas |
| `paper.surface-2` | `#e3dac7` | Hovered list rows, selected tabs, secondary buttons |
| `paper.surface-3` | `#d9cfb9` | Featured pricing card, emphasised section bands |
| `paper.surface-pressed` | `#e8e1cf` | Pressed surface (slightly darker than canvas) |
| `paper.hairline` | `rgba(28, 23, 16, 0.08)` | Subtle dense-row divider |
| `paper.hairline-strong` | `rgba(28, 23, 16, 0.16)` | Focused input ring, selected card outline |
| `paper.ink` | `#1c1710` | All headlines and primary body (warm dark, adjusted for beige canvas) |
| `paper.ink-strong` | `#000000` | Hero headline only. Used sparingly. |
| `paper.ink-muted` | `#6b6353` | Secondary body, captions |
| `paper.ink-faint` | `#9b9281` | Disabled, micro-legal, fine-print |

The canvas hex `#f4ede0` is a deliberate "Pumpkin-adjacent beige" - it lives in the same warm family as our new accent but desaturated to 9% saturation, so it reads as "paper" not "colour-tinted background". Side-by-side with Claude's `#faf9f5`, our `#f4ede0` is visibly warmer and more golden. Side-by-side with Lovable's `#f7f4ed`, our beige is more saturated.

### 5.3 Accent - Revised for Claude Differentiation

Original copper `#c8744a` was too close to Anthropic coral `#cc785c`. Both sit in the same warm-orange family with similar saturation. We shift to a more saturated, slightly cooler copper inspired by the Pumpkin reference `#FD802E` but tuned down to a sophisticated "vintage cinema lobby" tone - more orange weight than the muted-coral original.

| Token | Hex | Role |
|---|---|---|
| `accent.copper` | `#e0763a` | The single brand accent. Used on primary CTAs, on the brand wordmark dot, on the selection halo around chat-selected canvas objects, and on the timeline playhead. Nowhere else. |
| `accent.copper-soft` | `#f0a880` | Lightened variant for icon fills on copper surfaces and disabled accent state |
| `accent.copper-pressed` | `#b85d28` | Press state on copper buttons |
| `accent.copper-on-dark` | `#f08750` | Variant used as inline link colour on Studio Dark surfaces where the standard copper loses contrast |
| `accent.copper-glow` | `rgba(224, 118, 58, 0.18)` | The diffuse 18% alpha used for selection halos and focus rings. Never used as a fill. |

Side-by-side comparison:

| | Scene24 | Claude | Distinguishability |
|---|---|---|---|
| Canvas | `#f4ede0` (golden beige) | `#faf9f5` (neutral cream) | Clearly different - 35% more saturation |
| Accent | `#e0763a` (vintage copper-pumpkin) | `#cc785c` (muted coral) | Clearly different - 22 hue degrees apart |
| Dark | `#0c0d0f` (cool warm-near-black) | `#181715` (warm near-black) | Different temperature |

The revised palette is unmistakably Scene24, not adjacent-to-Claude. The cinematic identity strengthens (vintage-cinema-lobby vs gentle-craft-cream).

### 5.3.1 Optional Sub-Accent for Depth (Pumpkin × Warm-Charcoal Pairing)

We introduce one optional sub-accent for moments where the copper alone cannot carry. The original reference palette (Pumpkin × Charcoal `#FD802E` + `#233D4C`) used a cool blue-charcoal which violates Scene24's brand-wide rejection of blue/navy tones (Section 5.3.2). We retune the charcoal into the warm family so it stays in our brand voice.

| Token | Hex | Role |
|---|---|---|
| `accent.charcoal` | `#2a2520` | Warm dark brown-black. Reserved for poster-style marketing moments (hero illustration backgrounds, decorative panels on landing). Never used in core product UI. |

Hex `#2a2520` sits at hue ~30deg (warm orange-brown family) with very low saturation and very low lightness - it reads as "deep brown-black" rather than as "blue-grey". Compared to the original `#243240` cool charcoal, this is ~85 hue degrees warmer.

Usage limit: appears at most twice across the entire marketing site (typically as a card or hero accent on the landing page). Never in the editor, dashboard, or account surfaces. The pair "Pumpkin × Warm-Charcoal" (`#e0763a` + `#2a2520`) is the cinematic-poster signature of the brand.

### 5.3.2 Brand-Wide Color Constraint: No Blue or Navy

Scene24's brand explicitly rejects all blue, navy, and cool blue-grey tones across the entire visual system. This rule applies to every color decision - tokens, semantic states, illustrations, gradient blooms, decorative elements, user-uploaded brand assets surfacing as defaults, and any future palette extensions.

**Why this rule exists:**

The product owner has a strong personal aversion to blue/navy palettes. Beyond personal preference, this constraint reinforces the brand identity:
- Blue is the dominant accent of the SaaS category (Linear, Vercel, Stripe, every B2B tool ships with a blue accent)
- Avoiding blue automatically separates Scene24 from that visual lineage
- The cinematic/film-industry context lives in warm tones (golden hour, tungsten warmth, sunset copper); cool blue belongs to corporate software, not video craft

**Operational rules:**

- Token system contains zero hex values with hue in the 180-270 degree range (cyan through navy)
- Semantic colors (success/warn/error) use warm-adjacent tones: green with yellow undertone, amber for warn, red with orange undertone for error
- Illustrations and infographics on marketing surfaces use exclusively warm-family palettes (beige, copper, warm-dark, soft amber)
- Atmospheric blooms (Section 5.5, noise textures) never include cool blue gradients
- If a user-uploaded brand asset surfaces in `auto-detected colors` with a blue dominant, we still render it (we don't override user content) but the inspector flags it as "May feel cool against Scene24 surfaces"

**The single exception:**

Auth provider brand icons retain their official colors (Google's blue G logo, GitHub's monochrome mark, Apple's mark). These are brand-faithful exceptions covered in Section 13.16. No other exception exists.

**Future palette extensions:**

If Scene24 later needs to expand the palette (e.g. for a new feature, a new product line), the new colors must:
- Stay within hue range 0-90 (red through yellow-green) or 90-180 (yellow-green through cyan-cusp, only the warm half)
- Specifically forbidden range: hue 180-300 (cyan, blue, indigo, violet-cusp)
- Saturation: case by case, but warm pastels and warm earth tones preferred
- Validate against existing accent (copper) for harmony - new color and copper must look intentional side by side

This constraint is permanent and architectural, not stylistic. Any PR that introduces blue/navy tones is blocked until the colors are retuned into the warm family.

### 5.4 Semantic

| Token | Hex | Role |
|---|---|---|
| `semantic.success` | `#5b9a78` | Generation completed, save confirmation, render success |
| `semantic.warn` | `#c79443` | Soft warnings (timeout approaching, large file, draft unsaved) |
| `semantic.error` | `#c25548` | Validation errors, render failures, destructive confirmation |

Note: the semantic colours are tuned to harmonise with copper - they read as part of the warm family rather than as bright stop-light primaries. This is deliberate. Bright green and bright red would shout against the cream and the warm dark; muted warm-family equivalents stay quiet and the user still parses them as success/error.

### 5.4.1 Noise Texture System (atmospheric layer)

Scene24 ships a noise-texture atmospheric layer that lifts the canvas from "flat colour" to "textured surface". This is the most important visual upgrade after the colour-system revision. The texture is what makes the canvas feel like paper or like a film grain frame rather than a CSS background.

We do not generate noise textures procedurally with code. The grain produced by `feTurbulence` plus a few CSS tricks looks ten years out of date and reads as "developer attempting design". We use designer-grade noise textures from established sources, baked into PNG/WebP assets and applied via CSS background.

**Required noise textures (asset list):**

The team produces or licenses the following texture assets, each as a tiled PNG at 512x512 and 1024x1024 (2x for retina). They live in `/public/textures/`:

| Asset | Use | Where applied |
|---|---|---|
| `grain-paper.png` | Subtle film-grain over Paper canvas | Landing, dashboard, account - global body texture |
| `grain-studio.png` | Subtle film-grain over Studio canvas | Editor, generation stream - global body texture |
| `gradient-warm-bloom.png` | Diffuse warm-light bloom with grain | Landing hero background, auth atmospheric wash |
| `gradient-cool-bloom.png` | Diffuse cool-light bloom with grain | Generation stream background accent, account hero |
| `gradient-pumpkin-charcoal.png` | The signature Pumpkin × Charcoal gradient with grain | Marketing showcase moments (max 2 per landing) |
| `texture-paper-edge.png` | Soft vignette + paper edge texture | Modal backdrop, doc panel edge |

**Sourcing the textures (designer-grade, not code-generated):**

Production-grade noise textures come from these sources. The team picks the textures that match Scene24's beige/copper warmth, exports them at 512x512 and 1024x1024, and ships them as part of the brand asset library.

*Figma plugins (recommended for in-house generation):*
- **Noise & Texture by rog.ie** - generates seamless tiled noise, textures, patterns, and gradients with full control. The de facto Figma noise plugin. (URL: rog.ie/noise-texture)
- **Noise, Grain & Texture Generator** - tiled noise with density and size parameters
- **Grainy Gradient** - smooth gradients with built-in grain
- **Noisy Gradients** - Metavatar algorithm based, produces the gradient-bloom-with-grain look identical to the reference (the first image we received)
- **Noise Effect Generator** - quality noise + texture applied to any layer

*Figma Community files (downloadable presets):*
- "Noisy Gradients in Figma (Vectors + Texture)" - 10 noisy gradient compositions, vector + texture
- "Grains And Noise Textures" - high-quality grain/noise texture pack

*External generators (browser-based):*
- **Haikei** (haikei.app) - browser tool, generates gradient + noise compositions, exports SVG/PNG
- **Mesh** by Meshgradient.com - mesh gradient generator, exports with noise layer
- **Cohesion** by cohesion.io - mesh gradient + grain compositions

**Workflow:**

1. Designer opens Figma, runs Noisy Gradients plugin with Scene24 palette (`#f4ede0`, `#e0763a`, `#2a2520`)
2. Tunes density (15-25%), grain size (1-2px), bloom radius (60-80% of frame)
3. Exports 512x512 PNG at 1x and 1024x1024 PNG at 2x
4. Compresses via TinyPNG or Squoosh, target file size <40KB
5. Ships to `/public/textures/`
6. Applied via CSS background-image with `background-size: cover` for blooms, `background-repeat: repeat` for fine grain

**CSS application pattern:**

```css
/* Body grain - applied to the canvas surface */
body[data-theme="paper"]::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url("/textures/grain-paper.png");
  background-size: 512px 512px;
  background-repeat: repeat;
  opacity: 0.4;
  mix-blend-mode: multiply;
}

body[data-theme="studio"]::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url("/textures/grain-studio.png");
  background-size: 512px 512px;
  background-repeat: repeat;
  opacity: 0.3;
  mix-blend-mode: screen;
}

/* Hero bloom - applied as a decorative layer on landing hero */
.hero-bloom {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: url("/textures/gradient-warm-bloom.png");
  background-size: cover;
  background-position: center;
  opacity: 0.7;
  pointer-events: none;
}
```

**Critical rules:**

- Grain texture opacity: never above 50% on Paper, never above 35% on Studio. Above these thresholds the texture reads as "noisy" rather than "textured".
- Mix-blend-mode: `multiply` for Paper (darkens the canvas slightly), `screen` for Studio (lightens micro-pixels). This makes grain feel embedded in the surface rather than overlaid.
- Pointer events disabled on grain layers - they are decoration, not interactive.
- Asset compression: every texture file must be under 50KB. We are paying for a brand visual, not for shipping uncompressed PNG.
- Texture readability check: at every breakpoint, body text must remain ≥4.5:1 contrast with the textured canvas. If grain reduces readability, lower opacity until it is restored.
- One bloom per page maximum. Multiple blooms on the same page read as "atmospheric overuse" (the AI-product cliche we are avoiding).

**Anti-pattern within noise textures:**

The reference image (the first noise-texture screenshot received from the user) shows a magenta-orange-blue radial gradient with grain. That specific colour combination is the cliche - magenta plus cyan plus a hint of orange is "AI product 2024-2026 hero bloom". We do not use that gradient. Our blooms use exclusively warm-family gradients (beige to copper to deep charcoal) so we stay in our brand voice. The grain technique is borrowed; the colour palette is ours.

### 5.5 Atmospheric (auth screen only)

Used in exactly one place: the auth screen's ambient wash. Defined here so it is never extracted and re-used elsewhere.

| Token | Hex | Role |
|---|---|---|
| `atmosphere.warmth` | `#e8b89a` | The soft warm wash bloomed in the upper-left of the auth screen |
| `atmosphere.depth` | `#3a2e26` | The slightly cooler bloom bloomed in the lower-right of the auth screen |

These are not exposed elsewhere. They are not on the colour swatch reference. They exist solely so the auth screen has a quiet atmospheric character that signals "this is a thoughtful product" without sliding into AI-startup-rainbow territory.

### 5.6 Token Usage Rules

- Never inline a hex value. Always reference a token.
- Copper appears at most three times per visible viewport. Counting the user's cursor as a copper marker if the cursor is over an interactive element, the count includes one CTA, one selection halo, and one playhead. If you need a fourth copper element, the design is wrong.
- The two modes do not share canvas colours, but they do share ink: `studio.ink` and `paper.canvas` are the same hex. This is intentional. The brand's warm cream is the constant; what reverses is which side of the contrast it sits on.
- Semantic colours never appear on top of copper, and copper never appears on top of semantic colours. They live in separate functional layers.

---

## 6. Typography

### 6.1 Type Families

The system runs four font families, each with a precise role. We deliberately avoid Inter as the primary because Inter has become the default of the entire SaaS category - shipping with Inter signals "generic AI product", which is exactly the brand position we are counter-positioning against.

**Primary sans (display, body, UI):** Geist Sans Variable.
- Source: Vercel, open source under SIL Open Font License.
- Character: geometric humanist sans with confident terminals. Slightly more distinctive than Inter without being weird. Variable axis covers weights 100-900.
- Pairing with Korean: pairs well with Pretendard because both share humanist proportions and a similar x-height. The Hangul-Latin rhythm is consistent.
- Why this and not Inter: Inter is everywhere. Geist has a distinct voice (the slightly squared terminals on letters like t, l, i) that gives Scene24 a recognisable brand fingerprint. Production CDN: `https://vercel.com/font` or self-host from `@vercel/font`.

**Editorial serif (rare accent):** Fraunces.
- Source: open source under SIL Open Font License (Google Fonts).
- Character: contemporary editorial serif with variable axes for weight, opsize, softness, and wonk. We use it conservatively - weight 400 at opsize 144 for hero display, weight 500 at opsize 96 for sub-display.
- Where it appears: landing hero h1 (one use), pricing page section opener (one use), docs page title (one use), blog index (one use), about page if any (one use). Maximum five appearances across the entire product. This scarcity is the point.
- Why Fraunces over Source Serif: Fraunces has personality. Source Serif is well-engineered but neutral. We want editorial character at the moments serif appears.

**Korean primary:** Pretendard Variable.
- Source: open source under SIL Open Font License. Created by Kil Hyungjin.
- Character: humanist sans Korean typeface based on Inter, with Hangul rendered to match Inter's Latin rhythm. The only Korean web font that feels native-quality in a product UI.
- Letter spacing rule (CRITICAL): all Korean text running on Pretendard uses `letter-spacing: -2.5%` (or `-0.025em`). This is a non-negotiable Pretendard convention - the typeface is designed assuming this tracking, and renders awkwardly without it. The -2.5% applies to all sizes from micro to display.
- Production CDN: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/static/pretendard.css`. We also self-host the WOFF2 files for performance.

**Monospace:** Geist Mono Variable.
- Source: Vercel, open source.
- Character: companion to Geist Sans. Same geometric humanist DNA. Tabular by default. Variable weight axis.
- Why same family as Geist Sans: brand consistency at the typographic level. The eye reads Geist body and Geist mono as one voice.

### 6.2 Type Stack Declarations

The CSS variable declarations below are the authoritative stack. Note that Pretendard sits at index 2 in the sans stack - this means English text uses Geist, but the Korean Unicode block falls through to Pretendard (this is automatic Unicode-range-based font selection, which is how browsers handle multi-script stacks).

```css
:root {
  --font-sans: "Geist Sans Variable", "Geist Sans",
               "Pretendard Variable", "Pretendard",
               "Apple SD Gothic Neo", system-ui, -apple-system, sans-serif;
  --font-serif: "Fraunces Variable", "Fraunces",
                "Pretendard Variable", Georgia, serif;
  --font-mono: "Geist Mono Variable", "Geist Mono",
               "Pretendard Variable", "SF Mono", "Roboto Mono",
               Consolas, monospace;

  --font-feature-sans: "cv11" 1, "ss03" 1, "tnum" 1;
  --font-feature-mono: "calt" 1, "liga" 1;
  --font-feature-serif: "ss01" 1, "ss02" 1;
}

/* Korean letter-spacing override - applied universally when Pretendard renders */
*:lang(ko) {
  letter-spacing: -0.025em;
}

/* Specifically scope Pretendard tracking even when language attribute is missing */
.font-sans, .font-serif {
  /* Geist tracking is intentionally tight already; Pretendard fallback gets -2.5% via CSS variable */
  font-feature-settings: var(--font-feature-sans);
}
```

### 6.3 Unicode-Range Font Selection

To avoid Pretendard rendering Latin characters (Pretendard's Latin is fine but Geist's is better-tuned for our display sizes), we set unicode-range on the @font-face declarations:

```css
@font-face {
  font-family: "Geist Sans Variable";
  src: url("/fonts/Geist[wght].woff2") format("woff2-variations");
  font-weight: 100 900;
  font-display: swap;
  unicode-range: U+0000-024F, U+1E00-1EFF, U+2000-206F, U+2070-209F,
                 U+20A0-20CF, U+2100-214F;
  /* Covers Latin, Latin Extended, punctuation, currency, letterlike symbols */
}

@font-face {
  font-family: "Pretendard Variable";
  src: url("/fonts/Pretendard[wght].woff2") format("woff2-variations");
  font-weight: 100 900;
  font-display: swap;
  unicode-range: U+AC00-D7AF, U+1100-11FF, U+3130-318F, U+A960-A97F,
                 U+D7B0-D7FF;
  /* Covers Hangul Syllables, Jamo, Compatibility Jamo, Extended-A, Extended-B */
}
```

With this scoping, every character is rendered by the font designed for it. The user sees Geist for English, Pretendard for Korean, and the rhythm between them is consistent.

### 6.3 Hierarchy

All sizes given in pixels. The system uses an 8-step modular ramp with intermediate values for the body tier to support reading rhythm.

| Token | Size | Weight | Line height | Letter spacing | Use |
|---|---|---|---|---|---|
| `type.hero` | 72px | 500 | 1.02 | -0.04em | Landing page hero h1 only. Serif variant used on alternating landing surfaces. |
| `type.display-xl` | 56px | 500 | 1.05 | -0.035em | Section openers on landing |
| `type.display-lg` | 44px | 500 | 1.08 | -0.03em | Pricing tier headline, marketing section heads |
| `type.display-md` | 32px | 500 | 1.12 | -0.025em | Dashboard greeting, modal titles |
| `type.display-sm` | 24px | 500 | 1.18 | -0.02em | Section heads inside editor panels, card titles |
| `type.title-lg` | 20px | 600 | 1.25 | -0.012em | Panel titles, inspector group headers |
| `type.title-md` | 17px | 600 | 1.35 | -0.008em | Card titles, beat names |
| `type.title-sm` | 15px | 600 | 1.4 | -0.005em | Form labels, dense row headlines |
| `type.body-lg` | 17px | 400 | 1.55 | -0.005em | Lead paragraph, docs body |
| `type.body-md` | 15px | 400 | 1.55 | -0.003em | Default UI body, chat message text, paragraph body |
| `type.body-sm` | 13px | 400 | 1.5 | 0 | Captions, secondary metadata, footer body |
| `type.label-md` | 13px | 500 | 1.3 | 0.01em | Button labels, nav links, inspector field labels |
| `type.label-sm` | 12px | 500 | 1.3 | 0.02em | Pill labels, badge text, tab labels |
| `type.eyebrow` | 11px | 600 | 1.2 | 0.08em | Section eyebrows, category tags. Uppercase. |
| `type.micro` | 11px | 400 | 1.3 | 0.01em | Micro legal, copyright, version stamp |
| `type.mono-md` | 13px | 400 | 1.5 | 0 | CLI output rows in generation stream |
| `type.mono-sm` | 12px | 400 | 1.45 | 0 | Inline code, numeric inspector values |
| `type.mono-xs` | 11px | 500 | 1.3 | 0 | Timecode display on player, frame indices |

### 6.4 Type Principles

**Weight ladder is narrow.** The system uses 400, 500, 600, and rarely 700. Weight 300 appears nowhere - we tested it and the cream canvas absorbed it. Weight 700 appears once, on the auth screen's "Continue with" label, because that surface is intentionally restrained and weight 700 is the only way to surface a single critical action.

**Display sits at 500, not 600 and not 700.** Apple uses 600; Claude uses 400; Framer uses 500. Scene24 sits at 500 because the cinematic posture wants confidence without bombast.

**Letter-spacing is percentage-based at display sizes.** We scale negative tracking by size, not as a fixed pixel value. This is the lesson from Framer's -5.5px-at-110px detail: the relationship is roughly -3% to -4% of the type size for display, dropping toward 0 at body. The tokens above encode this as `em` units so the relationship survives any global font-size change.

**Body runs at 15px, not 16px.** This is a deliberate density choice. The editor surfaces are information-dense (chat threads, inspector fields, beat lists); 16px would push line-heights to crowd the canvas. 15px at line-height 1.55 hits the comfortable-reading sweet spot for our context. Landing and docs surfaces use `type.body-lg` (17px) for reading-mode pages.

**The serif is used at most five times across the product.** Once on the landing hero, once on the pricing page section opener, once on the docs title, once on the long-form blog index, and once on the company "About" page if we have one. The serif is editorial punctuation, not a UI typeface.

**Numerics use tabular figures everywhere.** `tnum` is enabled globally on `font-feature-sans`. Pricing rows, render duration counts, beat timecodes, inspector numeric fields all align across rows.

### 6.5 Code and Mono Usage

Monospace appears in three contexts:

1. **Generation stream tool-call rows.** Each row shows the tool name and arguments in mono so the user can read it as code-like output. The font carries no syntax highlighting - it is intentionally plain so it reads as "what the agent is doing" rather than as a code editor.

2. **Inspector numeric inputs.** Width, height, position, duration, easing values. Mono so the digits align vertically across rows. This is a small but consistent quality detail.

3. **Timecode on the player.** `00:00:08.500` style. Mono so the position indicator does not jitter as the timecode advances.

Code blocks in docs use mono with subtle syntax highlighting in muted ink tones - never the rainbow that VSCode ships. Three colours total: ink (default), `ink-muted` (comments), and `accent.copper` (keywords or string literals).

---

## 7. Spacing and Layout

### 7.1 Base Unit

The base unit is 4 pixels. All spacing tokens are multiples of 4. There are no exceptions.

### 7.2 Spacing Scale

| Token | Value | Use |
|---|---|---|
| `space.0` | 0 | Touching edges |
| `space.1` | 4px | Inline icon-text gap, tightest pair |
| `space.2` | 8px | Standard inline gap, button icon-label gap |
| `space.3` | 12px | Card internal label-value gap, list row vertical padding |
| `space.4` | 16px | Default card internal padding, inspector group internal gap |
| `space.5` | 20px | Panel internal padding, card vertical padding |
| `space.6` | 24px | Major component internal padding, dashboard card padding |
| `space.7` | 32px | Section internal padding, modal padding |
| `space.8` | 40px | Inter-section padding inside a page, hero internal padding |
| `space.9` | 56px | Section vertical rhythm on dense pages |
| `space.10` | 72px | Section vertical rhythm on standard pages |
| `space.11` | 96px | Section vertical rhythm on editorial pages |
| `space.12` | 128px | Hero vertical breathing, landing top-of-page space |

### 7.3 Grid and Container

**Maximum content width:** 1280px for marketing, 1440px for dashboard, full-bleed for editor.

**Marketing grid:** 12 columns, 24px gutters, 32px outer margin on desktop, 16px on mobile.

**Dashboard grid:** 12 columns, 16px gutters, 24px outer margin. Project cards lay out 3-up at 1024px+, 2-up at 768px, 1-up below.

**Editor grid:** Not a grid. The editor uses a three-zone flexible layout:

```
+-------+----------------------+--------+
|       |                      |        |
| Chat  |       Canvas         | Insp / |
| (L)   |       (centre)       | Doc(R) |
|       |                      |        |
+-------+----------------------+--------+
```

Left zone (Chat) default width: 380px. Resizable 320px-560px.
Right zone (Inspector / Doc Stream) default width: 420px. Resizable 360px-640px.
Centre zone (Canvas) absorbs remaining space.

Above the three-zone area sits the editor top bar (height 56px). Below the centre zone sits the beat timeline (height 88px). The chat and inspector zones run full-height.

### 7.4 Whitespace Philosophy

Marketing surfaces use editorial breathing: 96-128px section rhythm, 24-32px card internal padding, room for the type to read. Dashboard surfaces tighten to 56-72px section rhythm to surface more projects per scroll. Editor surfaces tighten further to 16-24px panel padding to maximise canvas area.

The rule: as the user gets closer to working, whitespace tightens; as the user is browsing or being marketed to, whitespace opens.

---

## 8. Border Radius and Shape

### 8.1 Radius Scale

| Token | Value | Use |
|---|---|---|
| `radius.0` | 0 | Reserved for full-bleed marketing tiles, never default |
| `radius.xs` | 4px | Inline tag chips, dense pricing comparison row pills |
| `radius.sm` | 6px | Small inline buttons inside cards, dropdown items |
| `radius.md` | 8px | Standard inputs, secondary buttons, badges |
| `radius.lg` | 10px | Primary buttons, chat message bubbles, nav pills |
| `radius.xl` | 14px | Cards (project, dashboard, pricing, feature) |
| `radius.2xl` | 20px | Major containers (auth card, modal, generation stream panel) |
| `radius.3xl` | 28px | Hero illustration container, marketing showcase frames |
| `radius.pill` | 9999px | Toggle pills only - the four-state generation status pill, the timeline scrubber thumb, pagination dots |
| `radius.full` | 50% | Avatars, circular icon buttons, the playhead dot |

### 8.2 Radius Rules

**Primary buttons use `radius.lg` (10px), not pill.** Scene24's primary CTA is a rounded rectangle, not a full pill. The pill geometry is reserved for state toggles where the shape itself signals "switch between values". This distinguishes us from the entire AI startup category (Anthropic, ElevenLabs, Framer all use full pills for primary). The 10px radius reads as "considered tool" rather than "consumer toy".

**Cards stay at `radius.xl` (14px).** Slightly more relaxed than the 8-12px most SaaS uses. Reads softer without being childish.

**Modal and major containers go to `radius.2xl` (20px).** The auth card, the generation stream panel, the export modal. The relaxed radius gives them a sense of being a distinct stage rather than just a panel.

**No `radius.0` outside full-bleed tiles.** Even dense list rows have a 4px corner.

### 8.3 Shape Pairings

A few intentional shape pairings define the brand:

**Rounded rectangle CTA + pill toggle.** The dashboard's "New project" button is `radius.lg`. The view-mode toggle directly above it is `radius.pill`. The contrast signals: one is an action, the other is a switch.

**Round avatar + rounded-rectangle card.** Project cards have `radius.xl` corners; the project owner avatar inside is `radius.full`. Avatars are the only `radius.full` elements outside the playhead.

**Pill scrubber thumb on rounded-rectangle timeline.** The timeline track is `radius.lg`; the scrubber thumb is `radius.pill`. Same logic - track is the object, thumb is the control.

### 8.4 Squircle - Apple-Style Continuous Corner

Standard CSS `border-radius` produces a G1 corner - a quarter-circle arc that meets the straight edge at a tangent. This is what every web framework defaults to, and it is visibly different from Apple's corners, which use a G2-continuity superellipse (the "squircle"). On Apple's corners, the curvature smoothly varies from zero on the straight edge to maximum at the corner midpoint and back to zero - the corner flows into the edge rather than meeting it abruptly.

The visual difference is subtle at small radii (<6px the eye cannot distinguish) but becomes pronounced on cards, modals, and buttons at radii 10px and up. A G1 corner reads as "made with CSS"; a G2 squircle reads as "designed". Scene24 ships squircle corners on all significant surfaces.

**Where to apply squircle:**
- All elements at `radius.lg` (10px) or larger get squircle treatment
- This includes: primary buttons, secondary buttons, cards (project, feature, pricing), modals, sheets, the chat input, the doc panel, the generation stream panel
- Smaller elements (`radius.xs`, `radius.sm`, `radius.md`) use standard CSS `border-radius` because the difference is imperceptible below 10px
- Pill and full-circle radii (`radius.pill`, `radius.full`) are unaffected - they are already maximum-curvature shapes

**Implementation approach:**

Three options exist for shipping squircle corners on web:

*Option 1: figma-squircle library (recommended for production).*
Install `@figma-plugin/squircle` (or the equivalent React wrapper). It generates an SVG path with the correct superellipse curve and uses it as a `clip-path` on the target element. Reliable, supports any size, works on all modern browsers.

```tsx
import { getSvgPath } from "figma-squircle";

const path = getSvgPath({
  width: 320,
  height: 200,
  cornerRadius: 14,
  cornerSmoothing: 0.6, // 0 = standard radius, 1 = maximum squircle
});

<div style={{ clipPath: `path('${path}')` }}>
  ...content
</div>
```

The `cornerSmoothing` value is the key parameter. We standardise on 0.6 across the system - this is the Apple iOS app icon smoothing value, validated as the natural squircle the eye expects.

*Option 2: CSS Houdini corner-shape (future-ready, partial support).*
Once Chromium ships `corner-shape: squircle` (currently behind a flag in Chrome 128+), we can drop the JS dependency and write:

```css
.card {
  border-radius: 14px;
  corner-shape: squircle;
}
```

Until cross-browser support is broad enough, we use figma-squircle as a polyfill.

*Option 3: Inline SVG mask (per-component, expensive).*
Used only for components where the squircle dimensions are unknown until render and the figma-squircle JS overhead is unacceptable. We do not expect to need this for Scene24.

**Squircle utility component:**

We ship a React `<Squircle>` component that wraps figma-squircle behaviour:

```tsx
<Squircle radius={14} smoothing={0.6} className="bg-surface-1 p-6">
  <h3>Card content</h3>
</Squircle>
```

All cards, modals, and major surfaces use this component. It applies the `clip-path` and exposes its children unchanged - styling, padding, and content render normally inside the squircle clip region.

**Squircle smoothing values by use case:**

| Component | Radius | Smoothing | Note |
|---|---|---|---|
| Primary button | 10px | 0.6 | Default squircle |
| Secondary button | 10px | 0.6 | Default squircle |
| Card (project, feature) | 14px | 0.6 | Default squircle |
| Pricing card | 14px | 0.6 | Default squircle |
| Modal | 20px | 0.7 | Slightly stronger squircle - the modal is a primary stage |
| Auth card | 20px | 0.7 | Same as modal |
| Doc panel | 20px | 0.7 | Slightly stronger squircle |
| Generation stream panel | 20px | 0.7 | Same |
| Hero illustration container | 28px | 0.8 | Maximum squircle - reads as deliberately designed surface |
| Mini-player loop on landing | 28px | 0.8 | Same |

**Border-radius shorthand still used for inputs and small elements:**

Inputs, badges, chips, dropdowns, and other elements at `radius.md` (8px) or smaller use standard `border-radius`. The visual difference is imperceptible and the build overhead of squircle is unnecessary.

### 8.5 Border Treatment - When Lines Are Allowed

Scene24 minimises border use because most hierarchy is carried by surface lift. However, borders are necessary in specific contexts. This subsection codifies when and how.

**Borders are allowed in these contexts:**

*Context 1: Inputs.*
Text inputs, search fields, numeric inputs, dropdowns. The border defines the input boundary - without it, the input would visually merge with the surrounding surface. Border style:
- Default: 1px solid `hairline`
- Focused: 1px solid `hairline-strong` + `elevation.focus-ring` (4px copper glow)
- Error: 1px solid `semantic.error` at 0.6 alpha
- Disabled: 1px solid `hairline` at 0.4 alpha

*Context 2: Selected card or selected item.*
When the user selects an item (a project card, a beat, a timeline element), the selection is signalled by:
- 1px solid `accent.copper` border (full-opacity)
- Plus a subtle `accent.copper-glow` outer halo (4px spread, 16% alpha)
- Surface unchanged - selection adds a border, does not change the surface

*Context 3: Featured / emphasised cards.*
Pricing tier featured card. Border:
- 1px solid `accent.copper` at 0.4 alpha (the soft branded outline)
- Plus interior fill shifts to `surface-3` (the deeper lift)

*Context 4: Floating sticky toolbar over moving content.*
The editor's top toolbar floats over the video canvas. To separate it from moving content:
- 1px solid `hairline` at the bottom edge only (no top, no sides)
- Plus `elevation.float-soft` shadow

*Context 5: Dense list rows.*
List rows in tables and dense lists need a visual separation that surface lift alone cannot provide (because every row would have to lift differently). Border:
- 1px solid `hairline` at the bottom of each row except the last
- The hairline is intentionally subtle (8% alpha on Paper, 6% on Studio)

**Borders are forbidden in these contexts:**

*Context A: Between nav and page content.*
The transition between the top nav and the page content below it is carried by spacing. Never a border line. The exception is on scroll: when the page is scrolled past 32px, a 1px `hairline` bottom border fades in on the nav over 200ms. This signals "the nav is stuck to the top" without a permanent line.

*Context B: Between sidebar and main content.*
The sidebar and main content share a canvas surface or differ by surface lift. The transition is the surface change, never a border line. If you find yourself wanting to add a 1px line between sidebar and main, the surface lift needs to be stronger instead.

*Context C: Around individual cards in a grid.*
Cards in a 3-up grid never get individual borders. They are separated by gutters (24px) and signalled by surface lift on hover. Borders around cards in a grid create a "grid of boxes" feel that competes with the content.

*Context D: As decorative dividers in marketing layouts.*
A horizontal line between two marketing sections is banned. Sections separate by spacing (96-128px vertical padding). If the spacing is correct, no divider is needed.

*Context E: Below form field labels.*
Form field labels sit above the input. A 1px line below the label and above the input is banned. The visual relationship is carried by proximity (8px gap), not by a line.

*Context F: Below page titles or section headings.*
Page titles do not get an "underline" 1px line below them. The hierarchy comes from typography (size, weight, spacing), not from a decorative line.

**Border-radius and border-width interaction:**

When a squircle element has a border, the border follows the squircle path. The figma-squircle library supports stroke generation:

```tsx
<Squircle radius={14} smoothing={0.6} stroke="1px hairline" className="bg-surface-1">
  ...
</Squircle>
```

For standard border-radius elements, regular CSS `border` works as expected.

---

## 9. Elevation and Depth

### 9.1 Elevation Philosophy

Scene24 builds depth almost entirely through surface lift, not shadow. A panel sits on a slightly lighter (or darker on Studio) surface than the canvas; a card sits on a slightly lighter surface than the panel; a hovered row sits on a slightly lighter surface than the card. This stair-step approach generates a complete hierarchy without ever casting a shadow.

Three exceptions where shadow appears:

**Exception 1: Floating sticky toolbar over the canvas.** The editor's top toolbar floats over the live video preview. Because the preview is moving content, surface lift alone cannot separate the toolbar visually. The toolbar uses `shadow.float-soft` (specified below) - a warm-toned, soft, slightly downward shadow that signals "I am above the canvas" without going hard or dark.

**Exception 2: Focused input keyboard focus ring.** Focus state on inputs uses a soft outer ring at `accent.copper-glow` (16% alpha) at a 4px spread. This is the accessibility focus indicator. It is the only place copper appears as a halo.

**Exception 3: Modal overlay.** Modals use a backdrop tint of `rgba(19, 17, 15, 0.6)` over a backdrop-filter blur of 8px. The modal card itself has no shadow - it is lifted from the page by the backdrop, not by elevation chrome.

### 9.2 Shadow Ramp - Five Precise Levels

Scene24 ships a five-level shadow ramp. The ramp is warm-toned - every shadow uses `rgba(19, 17, 15, X)` as its base, which is the same hex as `paper.ink`. This means shadows feel like soft warmth radiating from the element rather than the cool blue-gray drop common to most SaaS systems.

The ramp uses two layers per shadow level - an ambient layer (large blur, low alpha) and a contact layer (small blur, higher alpha at the bottom of the element). The two-layer composition gives the shadow physical believability without going dramatic.

| Token | Stack | Alpha range | Use |
|---|---|---|---|
| `shadow.0` (flat) | none | - | Default cards, list rows, body content |
| `shadow.1` (subtle) | `0 1px 2px rgba(19, 17, 15, 0.04)` | 4% | Hovered cards, resting state of project cards on dashboard |
| `shadow.2` (soft) | `0 4px 12px rgba(19, 17, 15, 0.06), 0 1px 2px rgba(19, 17, 15, 0.04)` | 4-6% | Dropdowns, popovers, tooltips, the chat input at rest |
| `shadow.3` (floating) | `0 12px 32px rgba(19, 17, 15, 0.10), 0 2px 6px rgba(19, 17, 15, 0.06)` | 6-10% | Modals (default), the floating sticky toolbar in editor, the main chat input on the home/new-chat surface |
| `shadow.4` (lifted) | `0 24px 64px rgba(19, 17, 15, 0.14), 0 4px 12px rgba(19, 17, 15, 0.08)` | 8-14% | Critical modals (export, destructive confirmations), the auth card, the generation-complete celebration modal |

**Shadow application rules:**

*Rule 1: Default state on cards is `shadow.0` (no shadow), not `shadow.1`.*
The brand position is "elevation through surface lift, not shadow". A card at rest sits on its surface and is differentiated by colour. Hover state introduces `shadow.1` (the most subtle level) - this is when shadow first appears. The user perceives this as the card "lifting" toward them on hover even though the y-position has not changed.

*Rule 2: Studio Dark uses the same warm-ink base for shadows.*
On dark surfaces, shadows are still `rgba(19, 17, 15, X)` - they read as "darker dark" against the canvas. Some teams use a lighter shadow on dark surfaces (e.g. `rgba(255, 255, 255, 0.04)` highlight). We do not. The warm-dark shadow on warm-dark canvas is subtle and consistent with the light-mode treatment.

*Rule 3: Shadow level is determined by purpose, not by visual hierarchy.*
A modal at `shadow.3` does not mean a modal "ranks higher" than a card at `shadow.1`. It means the modal is a temporary stage that floats over content and needs to read as "above the page", while the card is permanent furniture. Map shadow level to the functional role, not to importance.

*Rule 4: Backdrop blur replaces shadow for over-content surfaces.*
The editor's floating top toolbar uses both `shadow.3` and `backdrop-filter: blur(12px)`. The blur smears the canvas content underneath, which gives the toolbar a frosted-glass separation from the moving video below. The shadow alone would not be enough because the canvas content is moving.

*Rule 5: Auth card is the one exception that uses `shadow.4` for atmospheric reasons.*
The auth card sits on top of the atmospheric wash (Section 13.16). `shadow.4` gives the card real visual weight on top of the atmospheric blooms. This is the only marketing surface that gets `shadow.4` - everywhere else `shadow.4` is reserved for in-product critical modals.

### 9.3 Elevation Tokens (legacy table, retained for reference)

| Token | Treatment | Use |
|---|---|---|
| `elevation.flat` | No shadow, base surface | Default for body content, list rows |
| `elevation.lift-1` | One surface step up (e.g. `surface-1`) | Cards, panels |
| `elevation.lift-2` | Two surface steps up | Hovered cards, selected list rows |
| `elevation.lift-3` | Three surface steps up | Featured pricing card, the floating sticky toolbar (in addition to the shadow) |
| `elevation.float-soft` | Maps to `shadow.3` | Floating sticky toolbar, default modal |
| `elevation.float-strong` | Maps to `shadow.4` | Critical modals, auth card |
| `elevation.focus-ring` | `0 0 0 4px var(--accent-copper-glow)` | Keyboard focus on interactive elements |
| `elevation.modal-backdrop` | `rgba(19, 17, 15, 0.6)` over `backdrop-filter: blur(8px)` | Modal backdrop |

### 9.3 Surface Lift Rules

- A page has one canvas (`paper.canvas` or `studio.canvas`).
- Panels lift to `surface-1`.
- Cards inside panels lift to `surface-2`.
- Hovered cards lift to `surface-2` if they were at `surface-1`, or to `surface-3` if they were at `surface-2`.
- Selected cards keep their resting surface lift but pick up a 1px accent.copper-strong border (Studio) or a 1px paper.hairline-strong border (Paper).
- Pressed cards drop to `surface-pressed`, a colour slightly darker than the canvas.

This means a user can scan a screen and read "this is interactive, this is currently selected, this is being pressed" purely from luminosity steps. No shadow, no border, no chromatic emphasis required.

---

## 10. Iconography

### 10.1 Icon Family

All icons are custom SVG, drawn to a single stroke specification. We do not use Lucide, Feather, Heroicons, or any other library's icons unmodified. The reason is consistency - mixed icon families on a tool surface look uncomfortable, and the AI startup category has converged on a specific icon look (Lucide rounded, 2px stroke) that we want to distance from.

**Stroke spec:**
- Base size: 24x24 viewBox, scaled by container
- Stroke width: 1.5px at 24px (scales proportionally - 1.25px at 20px, 1px at 16px)
- Stroke linecap: round
- Stroke linejoin: round
- Fill: none (line icons), or accent.copper-soft at 0.2 opacity (when an icon needs a soft fill for state)
- Stroke colour: inherits from text colour via `currentColor`

**Icon weight variants:**
- `icon.line` (default): stroke only
- `icon.duotone`: 1.5px stroke with a 0.2-opacity copper fill on the secondary shape (used on hero illustrations and selected state)
- `icon.solid`: full fill - used only on the playhead dot, the brand mark, and avatars

### 10.2 Icon Inventory (initial set)

These are the icons the product needs at launch. Each is drawn from scratch using the stroke spec.

**Navigation icons** (16x16 default):
- `nav.home` - simple house, three roof lines, one base line
- `nav.projects` - stacked rounded rectangles (three layers)
- `nav.settings` - simple gear (six teeth, not eight - eight reads as too detailed)
- `nav.docs` - document with three horizontal text lines
- `nav.account` - circle with a half-circle base (avatar silhouette)

**Editor toolbar icons** (20x20 default):
- `tool.select` - arrow cursor pointing upper-left
- `tool.text` - serif T glyph (not sans, to differentiate from the body font)
- `tool.image` - rectangle with a small circle (sun motif) and a triangle (mountain)
- `tool.beat-marker` - vertical line with a small flag at top
- `tool.timecode` - clock face with two hands

**Inspector icons** (16x16 default):
- `inspector.position` - 4-way arrow cross
- `inspector.size` - resize handle (corner with two arrows)
- `inspector.rotation` - circular arrow
- `inspector.opacity` - rectangle with a diagonal gradient line drawn through it
- `inspector.animation` - sine wave glyph
- `inspector.duration` - hourglass
- `inspector.easing` - bezier curve glyph

**Status icons** (12x12 default):
- `status.pending` - empty circle
- `status.running` - circle with a notch missing at top (becomes the progress indicator - rotates via CSS transform)
- `status.success` - circle with a soft checkmark (the checkmark stroke is rounded, not sharp)
- `status.error` - circle with a soft x (the x strokes are rounded)
- `status.warn` - circle with a vertical line and a dot below

**Auth icons** (24x24 default):
- `auth.google` - Google G in Google brand colours (this is the one place we deviate from the icon family - auth provider marks must be brand-faithful)
- `auth.apple` - Apple wordmark logo in white/ink
- `auth.github` - GitHub octocat outline

**Action icons** (16x16 default):
- `action.play` - filled triangle (the only place we use a filled icon for action)
- `action.pause` - two vertical rectangles
- `action.stop` - filled square
- `action.upload` - upward arrow with a horizontal base line
- `action.download` - downward arrow with a horizontal base line
- `action.copy` - two overlapping rectangles
- `action.delete` - simple X (not a trash can - trash can reads as too consumer)
- `action.search` - magnifying glass (handle at 45deg)
- `action.expand` - four arrows pointing outward from centre
- `action.collapse` - four arrows pointing inward toward centre
- `action.close` - X glyph at 1.5px stroke
- `action.menu` - three horizontal lines (hamburger), all same width

**Brand mark:**
The Scene24 mark is a single SVG: a 6-pointed asterisk-like glyph that reads as the iris of a camera lens, or as a brutalist clock-face. Drawn at 16x16 minimum, scales up to 32x32 in the wordmark. The mark uses `accent.copper` as its fill on light surfaces and as its stroke on dark surfaces.

### 10.3 Icon Container Rules

- Icons inside buttons sit at button text size minus 2px (e.g. 13px button label gets a 12px icon).
- Icons in nav items sit at 16x16 inside a 24x24 tap target.
- Icons in the inspector sit at 14x14 inside a 20x20 hit area.
- Icons in the toolbar sit at 18x18 inside a 32x32 tap target.

### 10.4 What Icons Will Not Be

- No four-pointed-star "AI sparkle". Banned.
- No magic wand. Banned.
- No "robot face". Banned.
- No emoji. Banned anywhere in product UI.
- No filled colourful icon set. Even when an icon represents a coloured concept (e.g. a paint bucket), we use the line variant.

---

## 11. Motion System

Motion is a first-class design language in Scene24. Every state change carries a corresponding motion - not because motion is pretty, but because a tool with twenty-minute generations and a complex editing canvas needs motion to teach the user where things came from and where they are going. A button that opens a panel without animation is a button that asks the user to figure out, on their own, that a panel just appeared.

### 11.1 Motion Principles

**Principle 1: Motion is informative, not decorative.** Every animation answers a question - "where did this come from", "what just changed", "is the system still working". If a motion does not answer one of these questions, it should not exist.

**Principle 2: Motion is fast.** Default duration is 200ms. Long-form transitions (page-level wipes) cap at 480ms. We never let motion become a wait. The exception is the long-running generation progress, which is intentionally paced over minutes - but it streams continuous information, so it is not a single motion.

**Principle 3: Motion uses standard easings, named not numeric.** We use four easing tokens. The system never inlines a cubic-bezier curve in component code.

**Principle 4: Motion respects `prefers-reduced-motion`.** Every animated transition has a reduced-motion fallback - typically an instant transition with no movement, only a 100ms opacity fade.

**Principle 5: Motion never blocks input.** A user can click during a motion and the click is honoured immediately - the motion either completes or yields to the new state.

### 11.2 Easing Tokens

| Token | Curve | Use |
|---|---|---|
| `ease.standard` | `cubic-bezier(0.2, 0, 0, 1)` | The default. Used for opacity, surface lift, position changes that originate from user input. |
| `ease.emphasised` | `cubic-bezier(0.3, 0, 0, 1.2)` | A slight overshoot. Used for surfaces appearing from off-screen (panels sliding in, modals opening). The overshoot is subtle - the curve only goes 1.05x past target before settling. |
| `ease.decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | For elements arriving on screen, no overshoot. Used for incoming content. |
| `ease.accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | For elements leaving the screen. Used on dismissal motions, exit animations on the player. |

### 11.3 Duration Tokens

| Token | Value | Use |
|---|---|---|
| `duration.instant` | 0ms | Reduced-motion fallback, immediate state flips |
| `duration.quick` | 120ms | Hover state lift, button press scale, small chip toggles |
| `duration.base` | 200ms | The default for all state changes |
| `duration.relaxed` | 320ms | Panel slide-in, modal open, doc panel slide-in from right |
| `duration.slow` | 480ms | Page-level transitions (mode switch from Paper to Studio) |
| `duration.deliberate` | 800ms | Hero entrance on landing page (single-fire on page load) |

### 11.4 Standard Motions

The following motions are reusable patterns. Every component animation references one of these.

**`motion.fade-in`**
Property: opacity 0 to 1. Duration: `duration.base` (200ms). Easing: `ease.standard`.
Used when an element appears in place (e.g. dropdown content materialising after the trigger is clicked).

**`motion.fade-out`**
Property: opacity 1 to 0. Duration: `duration.quick` (120ms). Easing: `ease.accelerate`.
Used when an element is dismissed. Faster than fade-in because users perceive disappearance faster than appearance.

**`motion.slide-in-from-right`**
Properties: transform translateX(100%) to translateX(0), opacity 0 to 1. Duration: `duration.relaxed` (320ms). Easing: `ease.emphasised`.
Used for the doc panel sliding in from the right after a generation completes. Also used for inspector reveal.

**`motion.slide-out-to-right`**
Inverse of above. Duration: `duration.base` (200ms). Easing: `ease.accelerate`.

**`motion.slide-in-from-bottom`**
Properties: transform translateY(8px) to translateY(0), opacity 0 to 1. Duration: `duration.base` (200ms). Easing: `ease.decelerate`.
Used for chat message bubbles arriving, for new generation stream rows arriving, for toast notifications.

**`motion.lift-on-hover`**
Properties: background-color (one surface step up). Duration: `duration.quick` (120ms). Easing: `ease.standard`.
Used on every hoverable card and list row. Does not change y-position - lift is purely colour-based, consistent with our shadow-free elevation philosophy.

**`motion.press-down`**
Property: transform scale(0.96). Duration: `duration.quick` (120ms) on press-down, 200ms on release. Easing: `ease.standard`.
Used on every primary and secondary button. The scale value is identical to Apple's system. The release returns to scale(1) with `ease.emphasised` for a tiny overshoot that signals "released".

**`motion.expand-accordion`**
Properties: height auto, opacity 0 to 1. Duration: `duration.base` (200ms). Easing: `ease.decelerate`.
Used for the generation stream's expandable tool-call rows, the docs FAQ, the inspector property groups.

**`motion.scrub-playhead`**
Property: transform translateX on the playhead. Duration: matched to media duration, no easing (linear). Used for video playback.

**`motion.page-wipe`**
Used only at the Paper-to-Studio mode boundary. The outgoing page slides up-and-left at translateX(-12%) translateY(-8%) with opacity 0, while the incoming page slides in from translateX(8%) translateY(0%) with opacity 1. Both run simultaneously at `duration.slow` (480ms) using `ease.emphasised`. The 12% offsets are large enough to feel like a transition and small enough not to feel motion-sick.

**`motion.message-arrive`**
Used on every chat message and every generation stream row. The element starts at translateY(8px) opacity 0 and resolves to translateY(0) opacity 1 over 200ms with `ease.decelerate`. The 8px vertical offset matches the line-height of `type.body-md` - the message visually appears "from where it would have been a line ago".

**`motion.character-stream`**
Used for streamed text inside chat messages and generation stream rows. Each character is appended to the DOM as it arrives from the server stream. There is no per-character animation - the appearance of new text is the animation. This is intentionally subtle - over-animated character streams (each letter fading in over 80ms) read as showy.

### 11.5 State Transitions

Every interactive element has a default state, a hover state, an active (pressed) state, a focused state, and where applicable a selected and disabled state. The transitions between these states are specified.

**Default to hover:**
- Surface lifts one step (e.g. `surface-1` to `surface-2`)
- Duration: `duration.quick` (120ms)
- Easing: `ease.standard`
- No transform, no shadow change

**Hover to active:**
- Surface drops one step below resting (e.g. resting `surface-1` goes to `surface-pressed`)
- Transform scale: 0.96
- Duration: `duration.quick` (120ms)
- Easing: `ease.standard`

**Active to default:**
- Surface returns to resting
- Transform scale returns to 1
- Duration: 200ms
- Easing: `ease.emphasised` (tiny overshoot for tactile release)

**Default to focus (keyboard):**
- Focus ring at 4px spread, `accent.copper-glow`
- Duration: `duration.quick` (120ms)
- Easing: `ease.standard`

**Default to selected:**
- Surface stays at resting
- 1px copper border appears (`accent.copper-strong` on Studio, `paper.hairline-strong` adjusted to use copper on Paper)
- Duration: `duration.base` (200ms)
- Easing: `ease.standard`

**Default to disabled:**
- Opacity drops to 0.4
- Duration: `duration.base` (200ms)
- Cursor changes to not-allowed

### 11.6 View Transitions

**View transition: dashboard to editor.**
Trigger: user clicks a project card or "Open project" button.
Motion:
- Step 1 (0-160ms): the project card scales to 1.04 with no opacity change. This is the "the card is opening" pre-cue.
- Step 2 (160-640ms): the page-wipe motion (`motion.page-wipe`) starts. The dashboard slides up-and-left and the editor slides in from the bottom-right. The wipe is from `paper.canvas` to `studio.canvas`, and during the wipe a 480ms gradient interpolation transitions the canvas colour through neutral mid-tones.
- Step 3 (640-960ms): the editor's three zones (chat, canvas, inspector) fade in from opacity 0 to 1 in staggered order - canvas first (0-200ms after wipe), then chat and inspector simultaneously (200-400ms after wipe). The canvas first because the user is going there to see their video.

**View transition: editor to dashboard.**
Reverse of above. The video player pauses if playing. The wipe goes from `studio.canvas` to `paper.canvas`. The dashboard's project list fades in with a 60ms stagger per card (top-down) so the user re-orients to where they were.

**View transition: any modal opening.**
Backdrop fades in (0-200ms). Modal card scales from 0.96 to 1 with opacity 0 to 1 (200-400ms after backdrop start). The backdrop blur (`backdrop-filter: blur(0px)` to `blur(8px)`) interpolates over the same window.

**View transition: doc panel sliding in (after generation completes).**
The generated document panel slides in from the right (`motion.slide-in-from-right`), 320ms with `ease.emphasised`. The video preview that previously occupied the centre zone resizes (its width shrinks from full to centre-zone-width) over the same 320ms window. The user sees the video shrink while the doc appears.

### 11.7 Micro-interactions

**Brand mark wordmark on hover (landing page only):**
The 6-pointed Scene24 mark gently rotates 30 degrees clockwise over 600ms with `ease.standard`. Returns to 0deg on mouse-leave. This is the only ambient micro-interaction on the brand mark - everywhere else the mark is static.

**Beat thumbnail hover (timeline):**
The thumbnail scales to 1.05 and the surface lifts one step. The label below the thumbnail (beat name) fades in if it was hidden. Duration: `duration.quick` (120ms).

**Playhead drag:**
The playhead dot grows from 8px to 12px on grab, returns to 8px on release. No easing - the scale change is instant on grab and on release. The playhead position interpolates with `ease.standard` over 200ms when the user clicks on the timeline track (jump-to-position), but follows the cursor 1:1 when dragging.

**Inspector numeric field scroll:**
On focus, a small "drag to scrub" affordance appears (a tiny up-down chevron pair to the right of the field). When the user clicks the field and drags vertically, the value increments or decrements at 1 unit per pixel of drag (or 0.1 unit when shift is held, or 10 units when option is held). The cursor changes to a vertical-resize cursor during drag. This is the Figma scrub interaction.

**Chat input expand:**
The chat input is single-line at rest (40px tall). When the user types past one line, the input grows to accommodate, max 6 lines (240px). The growth animates at `duration.quick` (120ms). When the user submits or clears, the input snaps back to 40px instantly.

**Generation stream tool-call row:**
A new row appears with `motion.message-arrive`. The row has a state pill on the left (`status.pending` empty circle). When the tool starts running, the pill animates to `status.running` (the rotating notched circle). When the tool completes, the pill morphs to `status.success` checkmark - the checkmark draws itself from start to end over 200ms using SVG stroke-dasharray interpolation.

**Status pill checkmark draw:**
The checkmark inside `status.success` is drawn using SVG stroke-dasharray. On state change from running to success, the dasharray animates from full length to 0 (drawing the checkmark) over 200ms. This is the one place we use SVG path animation. It is reserved for this single moment.

**Copy-to-clipboard feedback:**
When a user copies code or a value, the copy button's icon briefly transforms - the two-rectangle copy icon morphs into a checkmark over 120ms, holds for 800ms, then morphs back. The button label changes from "Copy" to "Copied". The label change is instant; the icon morph is animated.

**Toast notification appearance:**
Toasts appear at the bottom-centre with `motion.slide-in-from-bottom` plus a small overshoot. They live for 4 seconds (success) or 6 seconds (error), then exit with `motion.fade-out` plus a translateY(8px) downward drift.

---

## 12. Interaction Patterns

### 12.1 Hover, Press, Focus, Selection

The four interactive states cover every actionable surface in the system. They are visually distinguishable - a user can see at a glance whether an element is being hovered, pressed, currently selected, or focused via keyboard.

| State | Studio Dark | Paper Light |
|---|---|---|
| Default | Surface at its resting level | Surface at its resting level |
| Hover | One surface step up | One surface step up |
| Press | Surface to `surface-pressed`, scale 0.96 | Surface to `surface-pressed`, scale 0.96 |
| Focus | 4px copper glow ring | 4px copper glow ring |
| Selected | 1px copper border, surface unchanged | 1px copper border, surface unchanged |
| Disabled | Opacity 0.4, no hover/press response | Opacity 0.4, no hover/press response |

### 12.2 Keyboard Conventions

The product is fully keyboard-navigable. Key bindings:

**Global:**
- `cmd/ctrl + k`: Open command palette (anywhere)
- `cmd/ctrl + ,`: Settings (anywhere)
- `cmd/ctrl + /`: Toggle keyboard shortcut overlay
- `esc`: Close any modal, dismiss any popover, exit any modal text editing

**Dashboard:**
- `n`: New project
- `cmd/ctrl + click on card`: Multi-select projects
- `enter` on card: Open project
- `cmd/ctrl + delete`: Delete selected projects (with confirmation)
- `/`: Focus search

**Editor:**
- `cmd/ctrl + z`: Undo
- `cmd/ctrl + shift + z`: Redo
- `cmd/ctrl + s`: Save (autosave is on; this is for explicit confirmation)
- `cmd/ctrl + e`: Export MP4
- `cmd/ctrl + b`: Toggle chat panel
- `cmd/ctrl + i`: Toggle inspector panel
- `space`: Play/pause preview
- `j/k`: Step backward/forward one frame on timeline
- `shift + j/k`: Step backward/forward ten frames
- `home`/`end`: Jump to start/end of timeline
- `cmd/ctrl + 1`...`5`: Jump to beat 1...5

**Chat:**
- `enter`: Submit message
- `shift + enter`: New line within message
- `up arrow` on empty input: Recall last submitted message (for re-editing)
- `cmd/ctrl + l`: Clear chat (with confirmation)

### 12.3 Right-Click Conventions

Right-click is used sparingly - we prefer hover-revealed action buttons or always-visible toolbars. However, in three contexts right-click is the natural ergonomics:

- **On a project card (dashboard):** Right-click opens a small menu with Open, Rename, Duplicate, Delete.
- **On a canvas object (editor):** Right-click opens an inspector quick-actions menu - "Reset to default", "Copy properties", "Paste properties to similar".
- **On a beat in the timeline:** Right-click opens beat actions - Duplicate beat, Delete beat, Change transition.

Right-click never replaces a primary action. It is a power-user accelerator.

### 12.4 Drag-and-Drop

Three drag-and-drop interactions exist:

**Drag canvas object to reposition:** When the user drags an object on the canvas, the object follows the cursor 1:1. Snap points exist at the canvas centre vertical and horizontal axes, and at object midpoints relative to other selected objects. Snap is visualised by a single 1px copper line at the snap axis - the line appears for the duration of the snap engagement and fades out at `motion.fade-out` when the drag releases or moves away from the snap.

**Drag beat to reorder timeline:** Beats can be reordered by dragging on the timeline. The dragged beat lifts to `surface-3` (Studio) and gains a subtle copper glow. Other beats shift to accommodate with `motion.slide-in-from-bottom` adapted to translate horizontally (`translateX(8px)` to `translateX(0)`). Release commits the new order.

**Drag inspector value (numeric scrub):** Described in Section 11.7.

### 12.5 Form Interaction

**Inline validation:** Required-field validation happens on blur, not on every keystroke. Showing red on every empty field while the user is typing is hostile - we wait until the user moves on.

**Error display:** Validation errors appear as a 13px `body-sm` line in `semantic.error` immediately below the input field. The input border subtly takes on `semantic.error` at 0.6 alpha. No exclamation icon, no shouted message.

**Success display:** Successful form submission triggers a toast in `semantic.success`. The form does not collapse or reset visibly - the user sees the toast and the form remains for context.

**Submit state:** While a form is submitting (network in-flight), the submit button shows a small spinner inside its label - a 12px rotating `status.running` icon. The button is disabled during submission. The submission completes within 200ms or shows a "this is taking longer than expected" line below.

---

## 13. Component Library

This is the full inventory of named components used across Scene24. Each component is specified with its surfaces, typography, padding, radius, and state transitions.

### 13.1 Buttons

**`button.primary`** - The brand action.
- Background: `accent.copper` (#c8744a)
- Text colour: `studio.ink` (the warm cream)
- Typography: `type.label-md`
- Padding: 10px vertical, 18px horizontal
- Radius: `radius.lg` (10px)
- Min-height: 40px
- Min-width: 88px (so single-word CTAs do not collapse to icon-sized)
- States:
  - Hover: background shifts to `#cc7d54` (5% lighter copper)
  - Press: background shifts to `accent.copper-pressed` (#a35d39), scale 0.96
  - Focus: `elevation.focus-ring`
  - Disabled: opacity 0.4, no hover response
- Usage: One per page maximum. "Start generating", "Export MP4", "Continue with Google".

**`button.primary-large`** - A scaled-up primary for hero CTAs on the landing page.
- Same colours and behaviour as `button.primary`
- Typography: `type.title-md`
- Padding: 16px vertical, 28px horizontal
- Min-height: 56px

**`button.secondary`** - The companion to primary.
- Background: transparent on canvas, `surface-1` when inside a `surface-1` panel
- Text colour: `paper.ink` (Paper) or `studio.ink` (Studio)
- Border: 1px solid `paper.hairline-strong` (Paper) or `studio.hairline-strong` (Studio)
- Typography: `type.label-md`
- Padding: 10px vertical, 18px horizontal
- Radius: `radius.lg` (10px)
- Min-height: 40px
- States:
  - Hover: background lifts to `surface-1` (or `surface-2` if already inside a panel)
  - Press: background drops to `surface-pressed`, scale 0.96
  - Focus: `elevation.focus-ring`
- Usage: Paired with primary - "Maybe later", "Cancel", "Sign in" (where Continue is the primary).

**`button.ghost`** - The lowest visual weight action.
- Background: transparent
- Text colour: `paper.ink-muted` (or `studio.ink-muted`)
- Border: none
- Typography: `type.label-md`
- Padding: 8px vertical, 12px horizontal
- Radius: `radius.md` (8px)
- States:
  - Hover: background lifts to `surface-1` opacity 0.6 (so it reads as the lightest possible surface change), text becomes ink (no longer muted)
  - Press: background to `surface-pressed`
- Usage: Tertiary actions, nav buttons, secondary toolbar actions, "View all", "Show more".

**`button.icon`** - Square icon-only button.
- Background: transparent at rest
- Icon colour: `paper.ink-muted` at rest, `paper.ink` on hover
- Size: 32x32 default, 40x40 for editor toolbar
- Radius: `radius.md` (8px)
- States: same as `button.ghost` for surface, icon transitions colour

**`button.icon-pill`** - Circular icon button.
- Background: `surface-1` at rest
- Icon colour: `paper.ink-muted` at rest, `paper.ink` on hover
- Size: 40x40 default
- Radius: `radius.full`
- Used: brand-mark holders, social link clusters in the footer, the chat avatar reset button.

**`button.destructive`** - Used only for delete actions.
- Background: `semantic.error` at 0.1 alpha (a soft warm-red tint)
- Text colour: `semantic.error`
- Border: 1px solid `semantic.error` at 0.4 alpha
- Typography: `type.label-md`
- Padding: 10px vertical, 18px horizontal
- Radius: `radius.lg` (10px)
- States:
  - Hover: background fills to `semantic.error` at 0.2 alpha
  - Press: background fills to `semantic.error` at 0.3 alpha
- Usage: Delete project, discard generation, reset to default - any irreversible negative action.

### 13.2 Inputs

**`input.text`** - Standard text input.
- Background: `paper.surface-1` (Paper) or `studio.surface-1` (Studio)
- Border: 1px solid `paper.hairline` (Paper) or `studio.hairline` (Studio)
- Text colour: ink
- Placeholder colour: ink-muted
- Typography: `type.body-md`
- Padding: 10px vertical, 14px horizontal
- Min-height: 40px
- Radius: `radius.md` (8px)
- States:
  - Focus: border lifts to `hairline-strong`, plus `elevation.focus-ring`
  - Error: border becomes `semantic.error` at 0.6 alpha
  - Disabled: opacity 0.4

**`input.text-large`** - Hero search input or prompt input.
- Same as `input.text` but with:
- Typography: `type.body-lg`
- Padding: 14px vertical, 18px horizontal
- Min-height: 56px

**`input.textarea`** - Multi-line.
- Same as `input.text` but allows resize vertical
- Min-height: 96px
- Max-height: 240px (then scrolls)

**`input.chat`** - The editor chat input. A special component, see Section 13.10.

**`input.search`** - Search field with leading icon.
- Same as `input.text` but with a leading 16px search icon, padded 14px from the left edge of input, text padded 40px from the left to clear the icon

**`input.numeric-scrub`** - Used in inspector. Numeric value with draggable scrubbing.
- Background: transparent
- Text colour: ink
- Typography: `type.mono-sm`
- Padding: 6px vertical, 8px horizontal
- Min-width: 56px
- Radius: `radius.sm` (6px)
- States:
  - Hover: background to `surface-1`, vertical resize cursor appears
  - Active drag: background to `surface-2`, value increments per-pixel of drag
  - Focus: input becomes editable, full input border appears

### 13.3 Cards

**`card.project`** - Dashboard project card.
- Background: `paper.surface-1`
- Border: none
- Radius: `radius.xl` (14px)
- Padding: 0 (content fills card)
- Internal layout: 16:9 preview thumbnail at top (fills full card width), 16px padding around metadata below
- Metadata block: project name in `type.title-md`, last edited in `type.body-sm` ink-muted, status pill at top-right
- States:
  - Hover: surface lifts to `paper.surface-2`, the preview thumbnail subtly zooms (transform scale 1.02) over 200ms
  - Selected (multi-select): 1px copper border
  - Press: scale 0.99

**`card.feature`** - Marketing feature card.
- Background: `paper.surface-1`
- Radius: `radius.xl` (14px)
- Padding: `space.6` (24px)
- Internal: icon at top (24x24, copper colour), title in `type.title-md`, body in `type.body-md`
- States: surface lift on hover

**`card.pricing`** - Pricing tier.
- Background: `paper.surface-1`
- Border: 1px solid `paper.hairline`
- Radius: `radius.xl` (14px)
- Padding: `space.7` (32px)
- Featured variant: background shifts to `studio.surface-2`, text inverts to studio ink. The featured-tier-is-dark pattern follows Anthropic Claude's convention.
- States: subtle surface lift on hover. No transform.

**`card.template`** - Template gallery card on dashboard.
- Background: `paper.surface-1`
- Radius: `radius.xl` (14px)
- 4:3 thumbnail at top
- Title in `type.title-md` below

**`card.generation-stream-panel`** - The major right-side panel that contains the streaming log during generation.
- Background: `studio.surface-1`
- Border: none
- Radius: `radius.2xl` (20px) on the corners that are not touching the page edge - in practice, the left edge of the panel has 20px radius corners but the right edge sits flush with the viewport edge
- Padding: 0 (header and body have their own internal padding)
- Header: `type.title-md` "Generation log" + close button, 56px tall
- Body: scrollable, contains the stream rows

### 13.4 Pills, Badges, Chips

**`pill.status`** - Surface status indicator.
- Background: surface lift based on state
- Text colour: ink-muted by default, ink by state
- Typography: `type.label-sm`
- Padding: 4px vertical, 10px horizontal
- Radius: `radius.pill`
- Variants:
  - `pill.status.pending`: ink-muted text, surface-1 background, empty circle leading icon
  - `pill.status.running`: ink text, surface-2 background, rotating notched circle leading icon
  - `pill.status.success`: `semantic.success` text on a subtle `semantic.success` at 0.1 alpha background, checkmark leading icon
  - `pill.status.error`: `semantic.error` text on a subtle `semantic.error` at 0.1 alpha background, x leading icon

**`badge.brand`** - For "Beta", "New", etc.
- Background: `accent.copper` at 0.16 alpha (a soft copper tint)
- Text colour: `accent.copper`
- Typography: `type.eyebrow` (11px / 600 / 0.08em tracking, uppercase)
- Padding: 2px vertical, 8px horizontal
- Radius: `radius.pill`

**`chip.tag`** - Project tag, filter chip.
- Background: `surface-1`
- Text colour: ink
- Typography: `type.label-sm`
- Padding: 4px vertical, 10px horizontal
- Radius: `radius.md` (8px)
- Closeable variant has a small 10px close icon at the right, 4px gap

### 13.5 Navigation

**`nav.top-marketing`** - Top nav on landing, pricing, marketing surfaces.
- Background: `paper.canvas` (matches page)
- Height: 64px
- Layout: wordmark + brand mark (left, 24x24 mark + wordmark in `type.title-md`), horizontal menu links (centre), sign-in text link + primary CTA (right)
- Border: none. The transition between nav and page below is visual - the nav has 24px bottom padding, the page hero starts with `space.10` (72px) padding. Spacing carries hierarchy.
- Scroll behaviour: at scroll y > 32px, the nav develops a subtle 1px `paper.hairline` bottom border that fades in over 200ms. The border fades out when scroll y returns to 0.
- Mobile: collapses to wordmark + hamburger at <768px. The hamburger opens a full-screen sheet (Studio Dark) with vertical menu links.

**`nav.top-app`** - Top nav inside the authenticated app (dashboard, settings, account).
- Background: `paper.canvas`
- Height: 56px
- Layout: brand mark (left, 20x20), breadcrumb path (centre - "Projects" / "Project Name"), account avatar (right)
- Border: none. Same scroll-border behaviour as marketing nav.

**`nav.top-editor`** - The editor's top toolbar.
- Background: `studio.surface-2`
- Height: 56px
- Layout: back-to-dashboard arrow + project name in `type.title-sm` (left), play/pause/timecode (centre), undo/redo + share + export (right)
- The toolbar uses `elevation.float-soft` because it floats over the canvas
- Border: 1px `studio.hairline` at the bottom - this is one of the few legitimate uses of a hairline in the system, because the toolbar floats over moving content and surface lift alone cannot separate it
- Mobile: actions collapse into a hamburger; primary play/pause stays visible

**`nav.sidebar-app`** - Optional persistent sidebar for the app. Not used in the editor.
- Background: `paper.canvas` (no surface lift)
- Width: 240px
- Layout: vertical stack of nav items
- Each item: 16x16 icon, 13px label, 8px horizontal padding, 32px tall
- Active item: surface lift to `surface-1`, ink text, no copper bar

### 13.6 Modals and Sheets

**`modal.default`** - Standard modal.
- Card surface: `paper.surface-1` (Paper context) or `studio.surface-2` (Studio context)
- Radius: `radius.2xl` (20px)
- Padding: `space.7` (32px) for the content, `space.6` (24px) for the header
- Max-width: 480px for standard modals, 640px for content-heavy modals, 800px for the export modal
- Header: title in `type.title-lg`, close icon button at top-right
- Footer: button row right-aligned, primary on the right, secondary to its left, ghost actions further left
- Backdrop: `elevation.modal-backdrop`
- Animation: see Section 11.6 (modal open)

**`modal.alert`** - Confirmation/destructive action.
- Same as `modal.default` but with:
- Max-width: 400px
- The primary button uses `button.destructive` variant
- Icon: a 32x32 warning icon at top-left of the content, copper or semantic.error tinted based on severity

**`sheet.bottom`** - A bottom sheet, used on mobile and for the keyboard-shortcut overlay.
- Slides up from the bottom edge
- Background: `paper.surface-1` or `studio.surface-1`
- Radius: `radius.2xl` (20px) on top corners only
- Padding: `space.6` (24px)

**`sheet.side-right`** - Right-edge slide-in sheet, used for the doc panel.
- See Section 13.13 for the doc panel specifics.

### 13.7 Toasts and Inline Messages

**`toast.default`** - The standard toast.
- Background: `studio.surface-2` (always Studio styling - toasts are global)
- Text colour: `studio.ink`
- Typography: `type.body-md`
- Radius: `radius.lg` (10px)
- Padding: `space.4` (16px) vertical, `space.5` (20px) horizontal
- Position: bottom-centre, 32px above the bottom edge
- Width: auto, max 480px
- Animation: `motion.slide-in-from-bottom`
- Duration on screen: 4 seconds for success/info, 6 seconds for warn, 8 seconds for error
- Action variant: an inline `button.ghost` to the right of the message ("Undo", "Retry", "View")
- Icon: optional 16x16 leading icon by variant (`status.success`, `status.error`, `status.warn`)

**`message.inline-info`** - Inline help text below an input.
- Typography: `type.body-sm`
- Colour: ink-muted (info) or `semantic.error` (error)
- No background, no border
- Margin-top from input: `space.2` (8px)

### 13.8 Tabs and Toggles

**`tabs.default`** - Horizontal tab bar.
- Background: transparent
- Each tab: `space.3` (12px) vertical, `space.4` (16px) horizontal padding
- Typography: `type.label-md`
- Inactive: ink-muted text, no background
- Active: ink text, with a 2px copper underline that animates between tabs (the underline slides horizontally between tab positions over 200ms with `ease.standard`)
- Hover: ink text, no underline change

**`toggle.pill-group`** - Segmented control.
- Container: `surface-1` background, `radius.pill`, padding 4px
- Each option: `radius.pill`, padding 6px 14px, typography `type.label-sm`
- Inactive option: transparent background, ink-muted text
- Active option: surface lifts to `surface-2`, ink text. No copper - the active state is communicated by surface lift alone.
- Animation: the active surface "thumb" slides between positions over 200ms with `ease.standard`

**`toggle.switch`** - On/off toggle.
- Track: 36px wide, 20px tall, `radius.pill`
- Knob: 16px circle, `radius.full`, 2px inset from track edges
- Off: track `surface-1`, knob ink-muted
- On: track `accent.copper`, knob white
- Animation: knob slides from left to right over 200ms with `ease.standard`. Track colour interpolates over the same window.

### 13.9 Lists and Tables

**`list.row`** - Generic list row.
- Default: surface unchanged (lives on whatever the parent is)
- Padding: `space.3` (12px) vertical, `space.4` (16px) horizontal
- Typography: `type.body-md`
- Border-bottom: 1px `hairline` - this is one of the few legitimate uses of hairline (dense list rows where typographic rhythm alone cannot create row boundary)
- States: hover surface lifts one step, press surface drops to `surface-pressed`

**`list.row-with-meta`** - List row with leading icon, label, and trailing metadata.
- Layout: 24x24 leading icon, label flex-1, trailing 13px metadata in `body-sm` ink-muted, optional trailing chevron icon

**`table.default`** - For pricing comparison, billing history, etc.
- Header row: `type.eyebrow` (11px / 600 / 0.08em tracking, uppercase) in ink-muted
- Body row: `type.body-md`, ink colour
- Row dividers: 1px `hairline`
- Cell padding: `space.3` (12px) vertical, `space.4` (16px) horizontal
- Numerics use `tnum` for column alignment

### 13.10 Chat Components (editor centrepiece)

**`chat.thread`** - The chat panel container.
- Background: `studio.surface-1` (in editor) or `paper.surface-1` (in onboarding)
- Width: 380px default (resizable)
- Layout: header (40px tall, project context + clear button) + scrollable message area + input at bottom (sticky)

**`chat.message-user`** - A message from the user.
- Background: `studio.surface-2` (Studio) or `paper.surface-2` (Paper)
- Radius: `radius.lg` (10px) with the bottom-right corner reduced to `radius.sm` (6px) for the speech-bubble tail effect, very subtle
- Padding: `space.3` (12px) vertical, `space.4` (16px) horizontal
- Typography: `type.body-md`
- Margin: 8px between consecutive messages
- Max-width: 80% of the chat panel width, right-aligned

**`chat.message-agent`** - A message from the agent.
- Background: transparent (no bubble)
- Padding: `space.3` (12px) vertical, 0 horizontal
- Typography: `type.body-md`
- Max-width: 100%
- Leading element: a 4px wide 100%-tall accent.copper bar at the left edge, only visible during streaming (fades out 200ms after stream completes)
- The agent's message is rendered as markdown - it can include inline code (`type.mono-sm` styled), bold, lists, and links. Code blocks render as mini code-window cards (see `card.code-window` below).

**`chat.message-context-chip`** - When the user selects a canvas object and submits, the chip showing what was selected appears above the message.
- Background: `accent.copper` at 0.12 alpha
- Text colour: `accent.copper-on-dark` (Studio) or `accent.copper` (Paper)
- Typography: `type.label-sm`
- Padding: 4px vertical, 8px horizontal
- Radius: `radius.sm` (6px)
- Format: "Selected: hook-headline text" - the object's data-scene24-id surfaces as the chip label

**`chat.tool-call-row`** - When the agent uses a tool mid-message, an expandable tool-call row appears inline.
- Default state: collapsed. Shows a single row: status pill (running/success), tool name in `type.mono-sm`, brief summary in `type.body-sm` ink-muted
- Expanded state: shows the full tool input and output in mono code
- Click anywhere on the row to expand/collapse
- Animation: `motion.expand-accordion`
- Background: `studio.surface-2`
- Radius: `radius.lg` (10px)
- Padding: 12px

**`chat.message-agent-actions`** - Action row below an agent message, revealed on hover.
- Default state: hidden
- Hover: row of 4 ghost icon buttons fade in below the message (16x16 icons, 4px gap)
- Actions: Retry (regenerate this response from the same prompt), Branch (create a new chat variant from this point), Copy (copy message text), Thumbs up/down (feedback)
- Background: transparent
- Animation: `motion.fade-in` 120ms on hover

**`chat.message-user-actions`** - Action row revealed on hover over user messages.
- Default state: hidden
- Hover: row of 3 ghost icon buttons fade in
- Actions: Edit (modifies the message in place; submitting re-runs the agent from that point, discarding subsequent messages), Copy, Delete
- Editing behaviour: clicking Edit converts the message bubble into an inline textarea preserving the bubble shape. Submit triggers re-run; cancel reverts.

**`chat.message-with-attachment`** - When the user attaches an image/reference to a message.
- The attachment renders above the text in the same message bubble
- Image attachments: max 240x180 thumbnail with `radius.md`, click to open full-size in a lightbox
- Up to 4 attachments per message, displayed in a 2x2 grid if 2+
- The user can drag-drop images directly onto the chat input or click the paperclip icon
- Supported formats: PNG, JPG, WebP, GIF (max 10MB each)
- The agent uses these images as visual references via the `view_screenshots` tool

**`chat.suggested-followups`** - Pill row appearing below the most recent agent message.
- Default: hidden
- Appears: 800ms after the agent's message completes streaming (delay prevents flicker during typing)
- Layout: horizontal scrollable row of 2-4 pill buttons
- Pill style: `surface-1` background, ink text, `radius.pill`, `type.label-sm`, padding 6px 14px
- Content: agent-generated follow-up suggestions like "Make it punchier", "Try a different transition", "Show me 3 variants", "Export as Reels"
- Click a pill: pre-populates chat input with that prompt. User can edit before submitting.
- Animation: `motion.fade-in` plus a brief stagger between pills (60ms each)

**`chat.regenerate-banner`** - Banner that appears when an agent message is being regenerated.
- Position: replaces the agent message bubble during regeneration
- Background: `surface-2`, dashed border 1px in `hairline-strong`
- Content: status pill ("Regenerating...") + the previous response in faded ink-muted at 50% opacity
- Once new response streams in, the banner is replaced

**`chat.branch-indicator`** - Visual showing this conversation has branched.
- Position: appears in the chat header when the user is viewing a branched variant
- Style: small pill with chevron, "Branch of [original chat name]" in `type.label-sm`
- Click: opens a tree view of all branches in this project
- Branches are also visible in the sidebar nested under the project (Section 14.6's variant pattern)

**`chat.input`** - The chat input.
- Background: `studio.surface-2`
- Border: 1px `studio.hairline`
- Radius: `radius.xl` (14px)
- Padding: 12px vertical, 14px horizontal, 14px right padding adjusted for the send button
- Typography: `type.body-md`
- Min-height: 48px, grows up to 240px as content fills
- Trailing send button: 28x28 circular `accent.copper` fill at `radius.full`, with an upward arrow icon
- Send button states: disabled (opacity 0.4) when input is empty, enabled when input has content, animates fill saturation on enable transition (the disabled state has the copper at 0.4 alpha; the enabled state pops to full saturation over 200ms)
- Focus: `elevation.focus-ring`
- Above the input there is an optional "Selected: X" chip that surfaces when the user has selected a canvas object - the chip can be dismissed with a small x icon

### 13.10.1 Long Conversation Management

When a chat thread grows beyond 50 messages, the UX needs to handle it without becoming hostile. Scrolling a 200-message conversation looking for "where we discussed the hook" is unusable.

**Pattern: Collapsible session segments + Quick search**

- After 30 messages, the chat header gains a search icon
- Click search: opens an inline search bar at the top of the chat thread
- Search highlights matching messages and scrolls to first match
- Above the first match, a "Jump to" affordance lets the user scroll between matches

**Pattern: Auto-summarisation of older messages**

- When the conversation exceeds 80 messages, the oldest 50 messages collapse into a "Earlier in this conversation (50 messages)" summary card at the top of the thread
- The card shows a 2-sentence agent-generated summary of the early conversation
- Click the card to expand and read the full history

**Pattern: Context window management**

- The agent's effective context window is finite (we use Claude Sonnet 4.6's 200K context)
- When approaching the context limit, the UI shows a discreet banner at the top of the chat: "We're approaching the conversation memory limit. Earlier context may be summarised."
- The agent automatically condenses older context when needed (handled by Claude Agent SDK)

**Pattern: New chat session for fresh starts**

- A "+ New chat in this project" button appears at the bottom of the sidebar's chat session list
- Clicking starts a fresh chat thread within the same project (shares brand assets and project state but starts the conversation clean)
- The original chat session is preserved and accessible from the sidebar

### 13.10.2 Inline Frame Preview in Chat

When the agent wants to reference a specific frame, beat, or render preview within its chat message, it can embed an inline thumbnail. This is distinct from the `stream.row-image-output` pattern (Section 13.15) which is in the generation stream surface.

**`chat.inline-frame`** - Inline frame thumbnail embedded in an agent message.
- Position: inline within the chat message bubble, between paragraphs
- Size: 240x135 (16:9) or 135x240 (9:16) depending on aspect
- Radius: `radius.md` (8px)
- Border: 1px `hairline`
- Bottom of thumbnail: caption row with frame timecode and beat name in `type.body-sm` ink-muted
- Hover: subtle scale to 1.02, cursor becomes pointer
- Click: opens a larger preview overlay with Open in Editor / Jump to this frame / Use as variant base actions
- Multiple frames in one message: laid out in a horizontal scrollable row if 2-4, in a 2x2 grid if exactly 4

**`chat.inline-document-link`** - Link to a doc that was streamed earlier (Section 16).
- Style: small card with document icon + doc title + creation date
- Click: opens the doc panel with that document loaded

**`chat.inline-tsx-diff`** - When the agent shows a code change.
- Style: `card.code-window` variant rendered inline
- Shows a small diff (red removed lines, green added lines) without syntax highlighting overkill
- Max 12 lines visible; truncates with "... show more" for longer diffs
- Background: `studio.surface-2`

### 13.11 Canvas Components (editor)

**`canvas.frame`** - The video preview area.
- Background: `studio.canvas` (the same near-black as the page)
- Border: none
- Aspect ratio: matches the video output aspect (typically 16:9 or 9:16)
- Centered inside the centre zone of the editor
- The frame itself is borderless - it sits on the canvas like a frameless screen

**`canvas.object-selection`** - The selection halo around a selected object.
- Border: 1px solid `accent.copper`
- Background: none (transparent fill)
- Corner handles: 8x8 copper squares at each corner of the selection rectangle
- Mid-edge handles: 8x4 copper rectangles at the midpoint of each edge
- The handles are interactive (drag to resize)
- Visual on selection: the handles fade in over 200ms with `motion.fade-in`

**`canvas.snap-line`** - The 1px copper line that appears when an object snaps.
- Width: 1px
- Colour: `accent.copper`
- Length: full canvas height or width
- Opacity: 0.8
- Fades in instantly, fades out at `motion.fade-out` when snap engagement ends

**`canvas.timecode-overlay`** - The semi-transparent timecode display at the bottom-right of the canvas during playback.
- Background: `studio.surface-3` at 0.8 alpha
- Text colour: `studio.ink`
- Typography: `type.mono-xs`
- Padding: 4px vertical, 8px horizontal
- Radius: `radius.sm` (6px)
- Position: 16px from bottom-right of the canvas frame
- Auto-hides 1 second after playback pause; reappears instantly on play or scrub

### 13.12 Timeline Components

**`timeline.container`** - The horizontal timeline below the canvas.
- Background: `studio.surface-1`
- Height: 88px
- Layout: timecode ruler on top (28px tall), beat cards row below (60px tall)
- Border: 1px `studio.hairline` at the top (separates from canvas zone)

**`timeline.beat-card`** - A single beat in the timeline.
- Background: `studio.surface-2`
- Radius: `radius.md` (8px)
- Height: 48px
- Width: proportional to beat duration relative to total video length
- Internal: beat name in `type.label-sm`, duration in `type.mono-xs` ink-muted
- States:
  - Hover: surface lifts to `studio.surface-3`, scale 1.02
  - Selected: 1px copper border, surface stays at resting
  - Dragging: surface lifts to `studio.surface-3`, scale 1.04, slight copper glow
- Drag-to-reorder behaviour as described in Section 12.4

**`timeline.ruler`** - The time markers above the beats.
- Background: transparent
- Tick marks: 1px `studio.hairline` at every second, `studio.hairline-strong` at every five seconds
- Labels: timecode at every five seconds in `type.mono-xs` ink-muted

**`timeline.playhead`** - The vertical line marking current playback position.
- Width: 1px
- Colour: `accent.copper`
- Spans the full timeline height (88px) plus extends 4px above and below
- Top: a 12x12 copper circle (`radius.full`) - the playhead "dot" that the user can grab
- Animation during playback: linear movement, no easing
- Animation on scrub: cursor-following, no easing
- Animation on click-to-jump: position interpolates with `ease.standard` over 200ms

### 13.13 Document Panel Components

The document panel is the right-side panel that streams in when the agent generates a document or produces an artifact. It is one of the most distinctive features of Scene24's editor.

**`doc.panel`** - The right-side doc panel.
- Background: `studio.surface-1`
- Width: 420px (resizable 360-640px via a 4px-wide drag handle on the left edge)
- Height: 100% of editor working area
- Radius: `radius.2xl` (20px) on the left corners, 0 on the right corners (flush with viewport edge)
- Header: 56px tall, "Document" title + doc name + close button + maximise button
- Body: scrollable doc content
- Animation: see `motion.slide-in-from-right`
- The presence of this panel shifts the canvas zone left, with the canvas re-centering to fill the remaining space

**`doc.streaming-header`** - The header bar while a doc is being written.
- Background: `studio.surface-2`
- Height: 40px
- Layout: status pill ("Writing...") + doc title (auto-generated from content) + line count + word count
- The "Writing..." pill becomes a "Complete" success pill when the streaming finishes; the transition uses the standard status pill state animation

**`doc.line`** - Each line of streamed doc content arrives as its own row.
- Background: transparent
- Padding: 0
- Typography: `type.body-md` (paragraph), `type.title-md` (heading), `type.mono-sm` (code), per markdown rendering
- Animation on arrival: `motion.message-arrive`

**`doc.toc`** - Auto-generated table of contents at the top of the doc panel.
- Visible when the doc has more than 3 headings
- Sticky at the top of the scrollable area, gives way to content on scroll
- Each TOC entry is a `list.row` with a copper bar at the left indicating active section

**`doc.maximised`** - The doc panel can be maximised to fill the full editor area.
- Trigger: maximise icon in the doc header
- Animation: the panel grows from its current right-side position to full-width, the chat panel slides out to the left (`motion.slide-out-to-right` adapted), the canvas zone fades out
- Reverse animation on minimise

### 13.14 Inspector Components

**`inspector.panel`** - The inspector container.
- Width: 320px when displayed in the right zone (when doc panel is not active)
- The inspector and the doc panel share the right zone - selecting an object on the canvas reveals the inspector; the doc panel appears when generation completes a document
- Both inspector and doc panel can be open simultaneously - they stack vertically in the right zone with a resizable divider between them

**`inspector.group`** - A property group.
- Container: no background, no border
- Header: section name in `type.eyebrow` (11px / 600 / 0.08em tracking, uppercase) ink-muted, plus a small chevron that toggles collapse
- Body: a vertical stack of inspector rows
- Default: expanded
- Collapse animation: `motion.expand-accordion`

**`inspector.row`** - A single property row.
- Layout: label (left, fixed 96px width, `type.label-sm` ink-muted) + control (right, fills remaining)
- Padding: 8px vertical, 0 horizontal (inherits panel padding)
- Multiple controls per row are supported (e.g. position-x and position-y on the same row)

**`inspector.numeric-scrub`** - Numeric input with scrub. (See `input.numeric-scrub` above.)

**`inspector.colour-picker`** - Colour swatch + value input.
- Swatch: 20x20 circle (`radius.full`), colour fill
- Value input: hex string in `type.mono-sm`
- Clicking the swatch opens a colour picker popover

**`inspector.selectfield`** - Dropdown.
- Same as `input.text` styling but with a trailing chevron icon
- On open: dropdown menu appears below the field with `motion.fade-in`, max-height 320px, scrollable

**`inspector.animation-curve`** - A small bezier-curve editor used for animation easing properties.
- Visual: a 96x96 box showing the easing curve
- Interaction: clicking on the curve segments lets the user adjust the bezier control points
- Below the curve: numeric x,y values for each control point in `type.mono-xs`

### 13.15 Generation Stream Components

The generation stream is the streaming activity log that the user watches while their video generates. It is the centrepiece of Scene24's "watch the work" UX. See Section 15 for the full pattern.

**`stream.container`** - The full-screen generation surface.
- Background: `studio.canvas`
- Layout: 64px header (project name, status, cancel button) + main streaming area + 88px footer (progress bar, elapsed time, ETA)

**`stream.row`** - Each row of agent activity.
- Background: transparent on default; `studio.surface-1` on hover; `studio.surface-2` when expanded
- Padding: 12px vertical, 16px horizontal
- Border-radius: `radius.md` (8px) when expanded; 0 when collapsed
- Layout:
  - Leading: 12x12 status pill (pending, running, success, error)
  - Centre: 13px row label in `type.body-md` (e.g. "Reading capture data", "Searching motion library", "Writing TSX")
  - Trailing: timestamp in `type.mono-xs` ink-muted
- Click to expand. Expanded shows the tool input and output in mono.
- Animation on arrival: `motion.message-arrive`
- The status pill animates between states as described in Section 11.7

**`stream.row-thinking`** - A row that contains the agent's reasoning, not a tool call.
- Different from `stream.row` in that:
- No status pill at the left - instead, a 4px vertical copper bar (only visible during streaming, fades out 200ms after the reasoning completes)
- The text is rendered as markdown
- Typography: `type.body-md`

**`stream.row-image-output`** - A row showing a frame thumbnail (when render_preview produces an image).
- Like `stream.row` but instead of just text, the row contains a thumbnail of the rendered frame
- Thumbnail: 16:9 aspect ratio, 200px wide
- Below thumbnail: frame timestamp (e.g. "00:00:03.500") in `type.mono-xs`
- Hovering the thumbnail subtly zooms it (scale 1.05)
- Clicking opens a larger preview overlay

**`stream.progress`** - The bottom progress bar.
- Track: 4px tall, `studio.surface-1` background, full width
- Fill: 4px tall, `accent.copper`, width proportional to overall progress
- Above the track: elapsed time (left) and ETA (right) in `type.mono-sm`
- The fill animates smoothly as progress increments, never jumps

**`stream.minimised-pip`** - A picture-in-picture version of the stream that appears at the bottom-right when the user navigates away during a generation.
- Width: 360px
- Height: 200px
- Background: `studio.surface-1`
- Radius: `radius.xl` (14px)
- Contents: a condensed stream view (most recent 3 rows visible) + progress bar
- Click to expand back to full-screen stream
- Animation on minimise: scales from full screen to the bottom-right, all elements scale and reposition together over 480ms with `ease.emphasised`

### 13.16 Auth Components

**`auth.card`** - The auth card.
- Background: `studio.surface-1`
- Radius: `radius.2xl` (20px)
- Padding: `space.10` (72px) vertical, `space.8` (40px) horizontal
- Width: 440px
- Centered on the auth page
- Internal:
  - 32x32 brand mark at top, centered
  - `type.display-sm` headline "Welcome to Scene24" / "Scene24에 오신 것을 환영합니다", centered
  - `type.body-md` subhead "Sign in with your provider to continue" / "프로바이더로 로그인하여 계속하세요", centered, ink-muted
  - 24px space
  - Three provider buttons stacked vertically with 12px gap
- The card has no border or shadow - the atmospheric wash (Section 5.5) carries the depth

**`auth.provider-button`** - One of the three social auth buttons (Google, Apple, GitHub).
- Background: `studio.surface-2`
- Border: 1px `studio.hairline-strong`
- Radius: `radius.lg` (10px)
- Padding: 14px vertical, 16px horizontal
- Min-height: 52px
- Layout: leading 20x20 brand icon (provider's brand colour - the one exception to the "icons use currentColor" rule) + label
- Label typography: `type.label-md` `studio.ink`
- Label text: "Continue with Google" / "Google로 계속하기" (or equivalent for other providers)
- States:
  - Hover: surface lifts to `studio.surface-3`
  - Press: surface drops to `studio.surface-pressed`, scale 0.99
  - Focus: `elevation.focus-ring`
- The icons retain provider brand colour even on Studio Dark - Google's G uses Google's brand palette, GitHub's mark uses white, Apple's logo uses white. This is the only place we permit non-system icon colours.

**`auth.atmospheric-wash`** - The ambient gradient behind the auth card.
- Two radial gradient blooms positioned absolutely:
  - Upper-left bloom: 800px wide circle, gradient from `atmosphere.warmth` (centre) to transparent (edge), centred at 20% from left and 20% from top
  - Lower-right bloom: 1000px wide circle, gradient from `atmosphere.depth` (centre) to transparent (edge), centred at 80% from left and 80% from top
- Both blooms at 40% opacity
- The page background is `studio.canvas`
- Subtle motion: each bloom slowly drifts in its position via CSS animation, 60 seconds per cycle, with `ease.standard`. The motion is barely perceptible - the user does not consciously notice it.

### 13.17 Footer

**`footer.marketing`** - The marketing-page footer.
- Background: `paper.canvas` (same as page - no surface change, the footer is hierarchically signalled by the increased section padding above it)
- Padding: `space.10` (72px) vertical, content max-width 1280px, 32px outer padding
- Layout: 5 columns on desktop - wordmark column (left, 280px) + 4 link columns (Product, Resources, Company, Legal)
- Below the columns: legal copy + locale switcher + social link cluster, all on one row
- Locale switcher: `toggle.pill-group` with EN / KR options, see Section 19
- Social cluster: three `button.icon-pill` for Twitter/X, GitHub, LinkedIn

**`footer.app`** - The app-page footer (dashboard, account).
- Minimal: a single 56px tall section with wordmark left, version stamp right
- Version stamp: `type.micro` ink-muted

---

## 14. Page Layouts

### 14.1 Landing Page

The landing page has six sections. Each section is a full-bleed band with content centered to the 1280px max-width. The sections alternate between `paper.canvas` and `paper.surface-1` surfaces - this is one of the few places where surface alternation creates section rhythm.

**Section 1: Hero**
- Surface: `paper.canvas`
- Height: 720px minimum
- Internal layout: 6-6 grid
- Left column: eyebrow ("Cinematic ad generation"), hero headline in `type.hero` (serif variant - this is one of the five places the serif appears), subhead in `type.body-lg` ink-muted, primary CTA "Generate your first ad" + secondary "See how it works"
- Right column: a curated mini-player loop - a 4-second hand-picked Scene24 output looping silently
- The player loop card has `radius.2xl` corners, sits on `studio.canvas` background (an island of Studio Dark inside Paper Light), and gives the hero its visual weight
- The brand wordmark in the top nav has a subtle ambient rotation animation (see Section 11.7)

**Section 2: How it works**
- Surface: `paper.surface-1`
- Three steps in a horizontal row, 1-3 numbering
- Each step has an illustration above (line-art on cream, copper accent on key strokes), a step title in `type.display-md`, and body in `type.body-md`
- Step 1: "Paste a URL" - illustration of a URL bar
- Step 2: "Watch the agent compose" - illustration of a stream-row stack
- Step 3: "Edit by chat or by hand" - illustration of a chat bubble overlapping with a cursor

**Section 3: Feature deep-dive 1 - Watch the work**
- Surface: `paper.canvas`
- Headline: "Generation isn't a black box."
- Body: explanation of streaming agent
- Visual: an embedded scrolling stream-style preview, contained in a `studio.canvas` island with `radius.2xl` corners
- The preview auto-scrolls, showing realistic agent activity rows arriving

**Section 4: Feature deep-dive 2 - Edit by dialogue**
- Surface: `paper.surface-1`
- Headline: "Talk to it. Or drag it. Or both."
- Visual: split screenshot of the editor showing chat panel and canvas inspector side-by-side
- Caption explains the dual-mode editing

**Section 5: Pricing teaser**
- Surface: `paper.canvas`
- Headline: "Pricing"
- Three pricing tier cards in a row (Hobby, Pro, Team)
- Each card uses `card.pricing` styling. The Pro card uses the featured variant (Studio Dark fill on cream surface)
- "View full pricing" link below

**Section 6: Footer**
- Standard `footer.marketing`

### 14.2 Pricing Page

A full pricing page that elaborates the teaser.
- Top: tier comparison cards (same as landing teaser but four tiers: Hobby, Pro, Team, Enterprise)
- Middle: feature comparison table (`table.default`)
- Bottom: FAQ section (`list.row` rows with accordion expand)

### 14.3 Auth Page

- Background: `studio.canvas` with `auth.atmospheric-wash` (Section 13.16)
- Single centered `auth.card`
- Below the card: small legal links "Terms" and "Privacy" in `type.micro` ink-muted with copper hover
- Above the card: a tiny back-to-landing link in the top-left corner

### 14.4 Home (Main Chat Entry)

The Home surface is the user's first stop after sign-in. It is not a traditional "dashboard with project tiles" - it is a chat-first entry inspired by ChatGPT and Claude's home screens, with project management surfaced through a persistent sidebar.

**Reason for this pattern:**
The user's primary intent on entering Scene24 is to make a new ad. The fastest path to that is a chat box where they paste a URL and describe what they want. A grid of past projects is secondary information - the user can access it through the sidebar but should not have to navigate through it to start working.

**Layout:**

```
+------------------+----------------------------------+
|                  |                                  |
|                  |                                  |
|  SIDEBAR         |          CENTRE STAGE            |
|  (260px)         |                                  |
|                  |   "What are we making today?"    |
|                  |                                  |
|  Workspace       |   [        big chat input      ] |
|  switcher        |                                  |
|                  |   [URL paste]  [Prompt examples] |
|  + New project   |                                  |
|                  |                                  |
|  Recent          |                                  |
|   Project A      |                                  |
|   Project B      |                                  |
|   Project C      |                                  |
|                  |                                  |
|  Projects ▼      |                                  |
|   Drafts         |                                  |
|   Done           |                                  |
|   Archived       |                                  |
|                  |                                  |
|  ─────────       |                                  |
|                  |                                  |
|  Settings        |                                  |
|  Account avatar  |                                  |
|                  |                                  |
+------------------+----------------------------------+
```

**Centre stage components:**

- 32px Scene24 wordmark at the top of the centre column (not in the nav - the wordmark gets a featured placement here)
- Greeting in `type.display-md` time-aware: "Good morning, Seongmin" / "안녕하세요, 성민님" before noon, "Good afternoon..." between noon and 5pm, "Good evening..." after 5pm
- Subhead in `type.body-md` ink-muted: "What are we making today?" / "오늘은 뭘 만들어볼까요?"
- **The hero chat input** - this is the focal point of the screen
- Below the input: a 3-up row of "Prompt examples" cards
- At the bottom of the centre stage: a "Or import a URL to generate" affordance

**Hero chat input (`chat.input.hero`):**
This is a special variant of the chat input, sized and styled to anchor the home page.
- Width: 720px (max-width, responsive)
- Min-height: 80px (grows up to 320px)
- Background: `paper.surface-1` with `shadow.3` (the floating shadow level)
- Border: 1px solid `paper.hairline`
- Radius: `radius.2xl` (20px) - squircle smoothing 0.7
- Padding: 20px 24px
- Typography: `type.body-lg` (17px / 400 / 1.55)
- Placeholder: "Paste a URL or describe the ad you want to make..." / "URL을 붙이거나, 만들고 싶은 광고를 설명해주세요..."
- Below the textarea, inside the same surface, a divider-free row of controls:
  - Left: file/screenshot upload button, brand-asset upload button (16px icon buttons)
  - Right: send button (`accent.copper` filled circular, 36x36)
- On focus: `elevation.focus-ring` plus shadow lifts to `shadow.4`
- On submit: the input animates with a slight scale-down (0.98) and the centre stage transitions to a generation-stream view (see Section 14.7)

**Prompt example cards (3-up row below hero input):**
Each card is 240px wide, 140px tall. Background `paper.surface-1`, radius `radius.xl` (14px), padding 16px. Each shows:
- A small line illustration at top (24x24) - the icon is in copper at 0.6 alpha
- A title in `type.title-sm` ("Launch a SaaS landing page")
- A one-line description in `type.body-sm` ink-muted ("Generate a 24-second cinematic launch ad from your SaaS website")
- Click the card to populate the chat input with the example prompt
- Hover: surface lifts to `surface-2`, shadow appears at `shadow.1`

Example prompts to ship:
- "Launch a SaaS landing page" - imports a URL, makes a cinematic launch ad
- "Mobile app demo" - vertical 9:16 format, walk-through of an app
- "Brand recap" - uses brand colours and assets, no URL needed

**URL paste affordance:**
Below the prompt example cards, a quieter row: "Or paste a URL directly: [   input   ]". This is a 480px-wide text-input variant with a leading link icon. Submitting jumps the URL into the chat input.

### 14.5 Sidebar - Project and Chat Management

The sidebar is the persistent navigation on the left of the home, dashboard, and editor surfaces. It is the user's primary way to switch between projects.

This is not a generic "AI sidebar" with a hamburger menu and a settings cog. It is designed to feel like the file tree of a serious tool - more like Linear's left rail or Figma's project sidebar than ChatGPT's stripped-down history list.

**Specs:**

- Width: 260px default. Resizable 240-360px via a 4px drag handle on the right edge.
- Collapsible to 56px (icon-only) via the keyboard shortcut `cmd/ctrl + b` or by clicking the collapse arrow at the top.
- Background: `paper.canvas` (no surface lift - sidebar shares the canvas)
- Border: 1px solid `paper.hairline` on the right edge - this is one of the allowed borders (Context B in Section 8.5 says no border between sidebar and main, but here the surface is identical so we add a hairline for orientation; this is the only exception)

Wait, no - revisiting the rule. The hairline is forbidden between sidebar and main. Surface lift carries the separation. We resolve this by setting the sidebar background to `paper.surface-1` (one lift above the main canvas). This way:
- Main content is on `paper.canvas`
- Sidebar is on `paper.surface-1`
- The boundary is the surface change, no border needed
- The 4px resize handle on the right edge has a subtle hover affordance (becomes copper on hover)

**Sidebar structure (top to bottom):**

*Section 1: Workspace switcher (top, 56px tall)*
- A horizontal row with the workspace name in `type.title-sm` plus a chevron
- Clicking opens a dropdown with the user's other workspaces (Team / Personal) and a "+ Create workspace" action
- Below the workspace row: a 24px gap

*Section 2: Primary action - New project (40px tall)*
- A `button.primary` "+ New project" (copper background, 40px tall, full-width of the sidebar minus 16px padding)
- This is the most-used action and gets primary visual weight

*Section 3: Recent (collapsible group)*
- Header: "Recent" in `type.eyebrow` (11px / 600 / 0.08em) ink-muted
- Below: a list of the 5 most recently opened projects
- Each row: 32px tall, leading 14x14 status dot (semantic colour by status), project name in `type.body-md`, no trailing metadata in the default state
- Hovering a row reveals trailing metadata (last-edited time in `type.body-sm` ink-muted) sliding in from the right
- Active project (the one currently open in the editor): surface lifts to `surface-2`, has a 2px copper left-edge bar

*Section 4: Projects (collapsible group with sub-categories)*
- Header: "Projects" in `type.eyebrow` with a chevron - clicking the header collapses/expands the entire group
- Sub-categories with chevrons:
  - Drafts (projects with no completed generation)
  - In Progress (projects currently generating)
  - Completed (projects with at least one export)
  - Archived (manually archived projects)
- Each sub-category shows a count next to the name in `type.body-sm` ink-muted
- Clicking a sub-category navigates to the Dashboard surface filtered to that category

*Section 5: Resources (collapsible group)*
- Templates
- Brand assets
- Docs
- Each is a row that navigates to the corresponding surface

*Spacer (flex-grow)*
The remaining vertical space pushes the bottom section down.

*Bottom section (always at the bottom of the sidebar):*
- A subtle divider (8px vertical gap, no line)
- Settings row (32px tall, icon + label)
- Account row (44px tall):
  - 28x28 avatar at the left
  - User name in `type.body-md`
  - Workspace name in `type.body-sm` ink-muted below
  - Trailing chevron
  - Clicking opens the account dropdown (sign-out, switch workspace, settings)

**Collapsed sidebar (56px wide):**
When collapsed, only icons are shown. The structure:
- Workspace mark (top, 32x32 - the workspace's icon or initial)
- "+ New" icon button (40x40, copper)
- 5 recent project dots (28x28, hover reveals tooltip with name)
- Vertical line of category icons (Drafts, Done, etc.)
- Bottom: avatar (32x32)

Tooltips on hover provide labels. Pressing `cmd/ctrl + b` expands again. The collapse/expand animation runs over `duration.relaxed` (320ms) with `ease.emphasised`.

**Sidebar on mobile:**
On mobile (<768px), the sidebar is hidden by default. A hamburger icon in the top-left of the nav opens it as a full-screen sheet (`sheet.bottom` variant - actually a left-edge slide-in). The sheet covers the full viewport and has the same content as the desktop sidebar.

### 14.6 Home-to-Editor Inline Transition (no page jump)

This is the single most important interaction flow in Scene24. When the user submits the hero chat input on Home, they do **not** navigate to a new page. The centre stage transforms in place. The chat input the user typed into stays visible. The conversation continues. This is the ChatGPT and Claude pattern - submitting a prompt does not load a new screen, it transitions the same screen.

This pattern matters because:
- Page navigation breaks the cognitive thread. The user submits a prompt and then loses context while a new page loads.
- The chat history is the conversation. The hero input is the first message. The agent's response is the next message. The user's follow-up is the message after that. Treating these as a continuous thread, not as "Home" then "Project page", matches the user's mental model.
- The visual transition reinforces "your prompt is being acted on right now", not "we are taking you somewhere else now".

**Transition steps:**

*Step 0: Before submit.*
The user is on Home. The hero chat input is centred on the screen with the greeting and prompt-example cards. The sidebar is on the left.

*Step 1: Submit (t=0ms).*
The user hits enter or clicks the send button. The hero chat input briefly scales down to 0.98 over 120ms (the standard press feedback). The send button shows a brief loading state.

*Step 2: Stage transform (t=120ms to 320ms).*
The centre stage transforms:
- The greeting headline and subhead fade out (`motion.fade-out`, 120ms)
- The prompt example cards slide down and fade out (`motion.slide-out-to-bottom` adapted, 120ms with `ease.accelerate`)
- The hero chat input shrinks from its centred 720px width and 80px-min-height to a chat-history bubble at the top of the now-expanding chat thread - the user's submitted message becomes a `chat.message-user` bubble
- A new chat thread surface materialises in the centre stage, with the submitted message at the top

*Step 3: Generation stream begins (t=320ms to 480ms).*
- An agent message bubble starts streaming in, beginning with "I'll start by reading your site..."
- A `stream.row` arrives below the agent message: "Reading capture data"
- The generation stream pattern (Section 15) takes over the centre stage

*Step 4: Editor materialisation (t=ongoing - happens when first render preview is available).*
- When the agent produces its first render preview, an editor canvas materialises to the right of the chat thread
- The transition: the chat thread, which was full-width centre stage, animates to the left zone position (380px wide) over `duration.relaxed` (320ms)
- Simultaneously, the canvas appears in the centre zone with the first preview frame loaded
- The right zone slides in with the doc panel or inspector based on context

Critically, **the chat thread is the same chat thread** throughout this entire transition. The user's hero input is at the top of the chat thread in the editor. They can scroll up to see it. They can scroll down to see all subsequent messages. The conversation is one continuous artefact.

**Why we do not page-navigate to /editor/:projectId:**

We do, internally, navigate the URL via `history.pushState` to `/editor/:projectId` so that the URL is shareable and refresh-safe. But the visual experience is not a page navigation - the user sees one continuous transformation. Refreshing the URL takes the user to the editor view with the same project loaded, but the in-flight transition is reserved for the natural submit-from-Home flow.

**Chat session and project mapping:**

A project can have multiple chat sessions. The first chat session of a project starts on Home (when the user submitted the hero prompt) and continues into the editor. The user can start a new chat session within the same project (e.g. to make a variant) by clicking "New chat" in the project's chat session list.

Sidebar layout for chat sessions:
- Within a project, the sidebar's chat section shows a chronological list of chat sessions
- Each session is named by the first user message (auto-titled, with manual rename)
- Clicking a session opens its chat thread in the editor centre zone
- Switching between sessions does not lose context - each session has its own preview state, its own beats, its own export history

**The "one project, many ads" pattern:**

A single project can contain multiple ad variants. The pattern:
- A project starts with one chat session producing one ad
- The user can branch the project at any point - "New variant from this point" - which forks the chat session and the resulting ad
- The project sidebar shows all variants as siblings under the project
- Each variant has its own ad, its own export, but shares brand assets and base prompt

Visual: when looking at a project in the sidebar, the project name is a collapsible header with the variants nested below as indented rows. The active variant has a 2px copper left-edge bar.

**Why this pattern over "one chat = one ad":**

Real ad workflows produce variants. A 30s and a 15s cut, a 16:9 and a 9:16, an English and a Korean version. Forcing each variant into a separate project makes the user manage variant relationships in their head. Treating variants as siblings of a project keeps the relationship explicit and the brand assets shared.

### 14.7 Dashboard (Projects List View)

Accessed via the sidebar's "Projects" group or the "View all" link. This is the traditional grid view for users who want to browse and manage projects rather than start a new one.

- Surface: `paper.canvas`
- Top: `nav.top-app` with breadcrumb "Projects"
- Content area: 1440px max-width, centred with sidebar offset
- Above projects grid:
  - Filter chips row (Drafts, In Progress, Completed, Archived) - `toggle.pill-group` variant
  - Search input + sort dropdown + view-mode toggle (grid/list)
- Projects grid in default grid mode: `card.project` in 3-up layout at 1024+, 2-up at 768, 1-up below
- In list mode: a table with columns Name / Status / Last Edited / Duration / Actions
- Each card shows: project preview thumbnail (or "Generating..." pill if mid-generation), name, last edited, status, plus a kebab menu icon on hover for quick actions (Rename, Duplicate, Archive, Delete)
- Empty state: no illustration. Just `type.display-md` "No projects yet." and a primary CTA "Create your first project."

### 14.5 Editor

The editor is the core surface. See Section 17 for the full editor composition pattern.
- Surface: `studio.canvas`
- Layout: three-zone (chat | canvas | inspector/doc) plus top toolbar plus bottom timeline
- See Section 7.3 (Grid and Container) for dimensions

### 14.6 Generation Stream (full-screen)

When the user first generates a project, they enter the full-screen generation stream. This is the moment that defines the product's "watch the work" character.
- Surface: `studio.canvas`
- Centered content column max-width 720px
- Top: 64px header with project context and a "Cancel generation" `button.destructive`
- Centre: vertical stack of `stream.row` and `stream.row-thinking` elements
- Bottom: 88px footer with `stream.progress`
- When generation completes, the stream area shrinks to a sidebar PIP (Section 13.15), and the editor takes over the full surface

### 14.9 Settings - Production-Grade Specification

Settings is one of the surfaces that gets dismissed as "we'll get to it later" and then never gets done properly. We do it properly from day one because settings is where serious users spend significant time, and a poorly-designed settings surface signals "this is a hobby product".

**Top-level structure:**

Settings uses a two-column layout: a left navigation rail (240px) listing settings sections, and a right content area showing the active section.

Sections (top to bottom in the rail):

1. **Account** - profile, name, email, password (if linked), connected providers
2. **Workspace** - workspace name, members, roles, invitations
3. **Brand** - default brand assets, colour palettes, fonts, logo for the user's brand (used by the agent as defaults when generating)
4. **Billing** - plan, usage, invoices, payment methods
5. **Generation defaults** - default output settings (resolution, frame rate, codec) applied to new projects
6. **Integrations** - connected services (Stripe, Notion, Slack, etc.)
7. **Notifications** - email and in-product notification preferences
8. **API** - API keys, webhook URLs (Pro/Team only)
9. **Appearance** - theme override (auto / paper / studio), language (EN / KR), reduced motion
10. **Keyboard shortcuts** - viewable, customisable
11. **Privacy and data** - data export, account deletion, training opt-out
12. **About** - version, changelog link, support link

Each section is a separate scrollable surface. Navigating between sections does not reload the page - the URL updates and the content area transitions with a `motion.fade-in`.

**Settings section layout:**

Inside any settings section, the content uses a consistent layout:

- Section title in `type.display-sm` (24px / 500 / -0.02em)
- Section description in `type.body-md` ink-muted
- 32px gap
- Settings rows grouped by sub-section
- Each sub-section has an `type.eyebrow` (11px / 600 / 0.08em, uppercase) header

**Settings row pattern:**

The standard settings row is a horizontal layout:

```
+-------------------------+-------------------+
| Label (left, 280px)     | Control (right)   |
| Description below       |                   |
+-------------------------+-------------------+
```

- Label in `type.title-sm` (15px / 600), description below in `type.body-sm` ink-muted (13px / 400)
- Control on the right: input, toggle, select, button, depending on the setting type
- Vertical padding 16px, no horizontal padding (inherits section padding)
- A subtle 1px `hairline` divider between rows - this is allowed because settings is dense content (Context C in Section 8.5)

**Account section:**

- Profile picture (with upload affordance - drag and drop a new image or click to choose file)
- Display name (input)
- Email (read-only, with "Change email" link that opens a confirmation flow)
- Connected providers (Google, Apple, GitHub - each shows connected state and a "Disconnect" button if more than one is connected)
- Two-factor authentication (toggle - opens a setup flow when enabled)

**Workspace section:**

- Workspace name (input)
- Workspace icon (upload, optional)
- Members (table with member rows, role chip per row, invite button at top)
- Pending invitations (table)
- Workspace plan (link to billing)
- Delete workspace (in a destructive section at the bottom)

**Brand section:** (this is unique to Scene24)

- Brand colour palette (a row of swatches the user has saved - click to edit, plus button to add)
- Brand logo (upload, with separate light-mode and dark-mode variants)
- Brand fonts (drop-down to select primary and secondary fonts from a curated list, plus custom upload)
- Brand voice prompt (a textarea with the user's description of their brand voice - used by the agent for tone)

**Generation defaults section:** (also unique to Scene24)

This is critical and is described in detail because it controls what comes out of the agent by default. Defaults can be overridden per project at export time.

Sub-sections:
- Output format defaults (see Export modal in Section 14.10 for full options)
- Duration default (15s / 30s / 60s)
- Aspect ratio default (16:9 / 9:16 / 1:1 / 4:5)
- Brand integration default (auto-detect brand assets from URL / use saved brand / mix)
- Beat structure default (3-beat / 5-beat / 7-beat / agent-decides)
- Motion intensity default (subtle / balanced / cinematic)

**Appearance section:**

- Theme: a 3-state segmented control: `Auto` (follows system), `Paper Light always` (forced light for users who prefer it everywhere), `Studio Dark always` (forced dark - rare, but available). Default is `Auto`.
- Note: the editor always uses Studio Dark regardless of this setting - the user setting only affects marketing, dashboard, and account surfaces
- Language: `EN` / `KR` toggle
- Reduced motion: toggle
- Default zoom level for editor canvas

**Keyboard shortcuts section:**

A full list of keyboard shortcuts grouped by context (Global, Dashboard, Editor, Chat). Each row shows the action name and the key binding, displayed as small key glyph chips. A "Customize" button next to each shortcut opens a recorder to capture a new binding.

**Settings overall design notes:**

- Settings surface uses Paper Light always (the appearance theme override does not apply to Settings itself - this surface is for changing preferences, so it makes sense to stay neutral)
- The settings surface has its own top nav with the breadcrumb "Settings > Section Name"
- Saving a setting: there is no explicit "Save" button on most rows. Changes save automatically on blur (text fields) or change (toggles, selects). A subtle "Saved" toast appears bottom-centre on save.
- Some sections do have explicit save (Brand, Generation defaults) where the user might want to preview changes before committing - those sections have a sticky bottom bar with "Discard" and "Save" actions that appears when there are unsaved changes.

### 14.10 Export Modal - Video Industry-Grade Encoding

When a user clicks "Export MP4" in the editor, an export modal opens. This modal is the bridge between Scene24's editing workflow and the broader video production world. Users will paste the exported file into ad networks (Meta Ads Manager, YouTube Ads, TikTok Ads), into social platforms, and into other video tools. Each of those destinations has technical requirements. The export modal must satisfy them without requiring the user to be a video engineer.

We studied how DaVinci Resolve, Adobe Premiere Pro, Final Cut Pro, Descript, Riverside, and Runway handle export. The pattern that works across all of them is **preset-first with manual override**: most users pick a preset that matches their target ("Meta Reels", "YouTube 1080p"), but power users can drop into the manual settings.

**Modal layout:**

The export modal is one of the most complex modals in the product. It uses `modal.default` at the wider 800px width.

```
+--------------------------------------------------------+
|  Export                                          [×]    |
|  Choose a preset or configure manually                  |
+--------------------------------------------------------+
|                                                         |
|  +-----------------+  +------------------------------+ |
|  |                 |  |                              | |
|  |  PRESETS        |  |  PREVIEW                     | |
|  |  (left, 240px)  |  |                              | |
|  |                 |  |  [thumbnail preview          | |
|  |  Quick          |  |   showing first frame]       | |
|  |   Web 1080p     |  |                              | |
|  |   Web 720p      |  |  Resolution: 1920 x 1080     | |
|  |                 |  |  Frame rate: 30 fps          | |
|  |  Social         |  |  Codec: H.264                | |
|  |   Meta Reels    |  |  Estimated size: 8.2 MB      | |
|  |   YouTube       |  |  Estimated time: 2-3 min     | |
|  |   TikTok        |  |                              | |
|  |   Instagram     |  +------------------------------+ |
|  |                                                     |
|  |  Quality                                           |
|  |   Highest                                          |
|  |   Standard                                         |
|  |                                                     |
|  |  ─────────                                         |
|  |   Manual                                           |
|  +-----------------+                                  |
|                                                         |
|  +-----------------------------------------------+    |
|  | DETAILED SETTINGS (expandable accordion)        |   |
|  | > Video                                          |  |
|  | > Audio                                          |  |
|  | > Container                                      |  |
|  | > Colour                                         |  |
|  +-----------------------------------------------+    |
|                                                         |
|                          [Cancel]    [Export]          |
+--------------------------------------------------------+
```

**Preset list (left column):**

Each preset is a clickable row. Selected preset has surface lift to `surface-2` and a 1px copper left-edge bar.

Preset categories:

*Category 1: Quick web*
- **Web 1080p** - 1920x1080, 30fps, H.264, AAC 192kbps. Generic web ad use.
- **Web 720p** - 1280x720, 30fps, H.264, AAC 128kbps. Smaller file for quick previews.

*Category 2: Social platforms (with platform-specific specs)*
- **Meta (Facebook / Instagram Feed)** - 1080x1080 (1:1), 30fps, H.264, AAC 128kbps, max 240s. Meta's recommended specs.
- **Meta Reels / Instagram Reels** - 1080x1920 (9:16), 30fps, H.264, AAC 128kbps, max 90s.
- **Instagram Stories** - 1080x1920 (9:16), 30fps, H.264, AAC 128kbps, max 15s per story.
- **YouTube 1080p** - 1920x1080 (16:9), 30fps, H.264 (or VP9), AAC, max-bitrate 8Mbps.
- **YouTube Shorts** - 1080x1920 (9:16), 30fps, H.264, AAC, max 60s.
- **TikTok** - 1080x1920 (9:16), 30fps, H.264, AAC 128kbps, max 180s.
- **LinkedIn Feed** - 1920x1080 (16:9), 30fps, H.264, AAC 128kbps, max 600s.
- **X (Twitter)** - 1920x1080 (16:9), 30fps, H.264, AAC 128kbps, max 140s.

*Category 3: Professional / Master*
- **ProRes 422 HQ** - master file in ProRes for further editing. 1920x1080, 30fps, ProRes 422 HQ, PCM audio. .mov container. Large file size, lossless quality.
- **H.265 Master** - 1920x1080, 60fps, H.265, AAC. Smaller than ProRes, near-lossless.
- **4K Master** - 3840x2160, 30fps, H.265, AAC. For users with 4K source material.

*Category 4: Quality presets (universal modifier)*
- **Highest** - max bitrate, slow encode (best quality)
- **Standard** - balanced bitrate, moderate encode time
- **Smaller file** - aggressive bitrate, fast encode

*Category 5: Manual*
- **Custom** - opens all detailed settings for manual configuration

**Preview pane (right column, top):**

- A 320x180 thumbnail preview of the first frame of the video
- Below the thumbnail: a summary list of the selected preset's specs
- Estimated file size (calculated from resolution × bitrate × duration)
- Estimated render time (based on agent's last render performance for this project)
- A small "What does this mean?" link that opens an inline explainer

**Detailed settings accordion (bottom of modal):**

Collapsible. Default state: collapsed. Power users expand to see and override.

*Section: Video*
- Resolution: select (presets: 4K, 1440p, 1080p, 720p, 480p, custom). Custom opens two numeric inputs for width and height.
- Frame rate: select (24, 25, 30, 50, 60). 24 fps is the cinematic default and gets a "(cinematic)" suffix in the label.
- Codec: select (H.264 / H.265 / VP9 / ProRes 422 / ProRes 422 HQ / ProRes 4444). Each codec has a tooltip explaining when to use it.
- Bitrate mode: segmented control (CBR / VBR / quality-target). Default VBR.
  - CBR (constant bitrate) - fixed bitrate, predictable file size
  - VBR (variable bitrate) - bitrate varies with content complexity, better quality at same average size
  - Quality-target - encoder targets a CRF value (Constant Rate Factor)
- Bitrate / CRF: numeric input. Bitrate in Mbps for CBR/VBR; CRF value 14-30 for quality-target mode (lower = better quality). Tooltip shows recommended range.
- Profile: select (Baseline / Main / High / High 10 for H.264; similar for H.265). Default High.
- Pixel format: select (YUV 4:2:0 / YUV 4:2:2 / YUV 4:4:4 / RGB). Default YUV 4:2:0.

*Section: Audio*
- Codec: select (AAC / Opus / PCM). Default AAC.
- Sample rate: select (44100 / 48000 / 96000). Default 48000.
- Channels: select (Mono / Stereo / 5.1). Default Stereo.
- Bitrate: select (96 / 128 / 192 / 256 / 320 kbps). Default 192.
- Audio normalisation: toggle. When on, audio is normalised to broadcast loudness (-23 LUFS for video, -16 LUFS for streaming). Default: on, with a sub-select for the target loudness.

*Section: Container*
- File format: select (MP4 / MOV / WebM / MKV). Determines container, separately from codec choice.
- File name: input. Default: project name + timestamp.
- Add metadata: toggle. When on, embeds title, description, creator into the file metadata.

*Section: Colour*
- Colour space: select (Rec.709 / Rec.2020 / sRGB / Display P3). Default Rec.709 (broadcast standard).
- Colour range: segmented (Full / Limited / Auto). Default Limited.
- HDR: toggle (only available if codec supports HDR - greys out otherwise). When on, adds HDR metadata.

**Export button:**

The primary action at the bottom-right. `button.primary` with label "Export". When clicked:
- The modal does not close immediately
- The button label changes to "Rendering..." with a small `status.running` icon
- A progress bar appears below the preview pane, showing render progress 0-100%
- An estimated time remaining updates as the render proceeds
- When render completes, the button shows a "Download" state with a download icon - clicking downloads the file
- The modal can be closed during render (the render continues in the background, and a toast notifies completion)

**Render queue:**
If the user starts a second export while the first is still rendering, they queue. A "Render queue" indicator appears in the top-right of the app nav with a count.

**Export history:**
After a successful export, the file is stored in Scene24's cloud for 30 days. The user can re-download from a "Export history" panel accessed via the project's actions menu. After 30 days, the cloud file is deleted but the project itself remains and can be re-rendered.

**Why this level of detail:**
The user explicitly noted that simple presets risk producing low-quality output. The detailed settings exist for two reasons: serious users will want to control them, and even users who never open the accordion benefit from the presets being calibrated against the right detailed settings. The accordion is the engineering surface; the presets are the user surface; both must coexist.

### 14.11 Editor Settings - Per-Project Configuration

In addition to global Settings, each project has its own settings accessible from the editor's top toolbar (a gear icon). This includes:

- Project name (editable)
- Project description
- Default output preset (overrides global default for this project's exports)
- Beat structure for this project
- Brand assets used for this project
- Collaborators on this project (Team plan)
- Visibility (Private / Workspace / Public-with-link)

The project settings open as a `modal.default` from within the editor without leaving the editor surface.

### 14.8 Docs

- Surface: `paper.canvas`
- Three-column layout: TOC left (240px), content centre (max 720px), inline ToC right (200px)
- Body uses `type.body-lg` for reading rhythm
- Code blocks use `type.mono-md` with subtle syntax highlighting (Section 6.5)
- The headline at the top of each doc page uses the serif `type.display-md` - this is one of the five places the serif appears

---

## 15. Long-Running Task UX (20-Minute Rendering)

A Scene24 generation takes fifteen to twenty minutes. This is the longest single user-facing task in any consumer-facing AI product the team is aware of. The UX challenge is brutal: the user must be kept engaged, informed, and confident that the system is working, for the full duration, without exhausting them.

We do not solve this with a progress bar. A progress bar would make twenty minutes feel like twenty minutes. We solve it by making the wait the entertainment.

### 15.1 The Three-Phase Wait

The wait is segmented into three phases, each with a distinct visual character.

**Phase 1: Setup (first 30 seconds).**
The agent reads the capture, reviews the knowledge files, and forms its plan. During this phase the user sees:
- A header: "Reading your site"
- 3-5 `stream.row` rows arriving sequentially as the agent reads files
- Each row collapses to a one-line summary; the user can expand any row to see the actual file content read
- A subtle "Setting up" indication in the top header

**Phase 2: Composition (10-15 minutes).**
The agent writes the TSX, renders previews, evaluates them, and iterates. During this phase the user sees:
- Continuous stream of `stream.row` rows: motion library searches, reference ad reads, TSX writes, render previews, self-critiques
- Periodic `stream.row-image-output` rows showing actual rendered frames from each iteration
- The progress bar advances irregularly - sometimes jumping 8% as the agent finishes a beat, sometimes stalling at 47% while it iterates on a transition
- The header text updates as phases advance: "Composing the hook beat", "Rendering preview", "Reviewing the result"

**Phase 3: Finalisation (last 90 seconds).**
The agent does a final pass and writes any associated docs. During this phase:
- Frame thumbnails appear in `stream.row-image-output` covering the full video timeline
- A document panel may slide in from the right if the agent wrote a generation summary doc
- The progress bar approaches 100%

When the generation completes, the stream view does not disappear - it persists in a minimised PIP (Section 13.15) so the user can scroll back through the agent's work if they want. The PIP slowly shrinks to a small button after 30 seconds of being unobserved, but it never disappears entirely until the user dismisses it.

### 15.2 What the User Can Do During the Wait

The user is not locked into the stream view. They can:

- **Navigate away.** Moving to Dashboard or Settings does not cancel the generation. The minimised stream PIP follows them across pages, anchored to the bottom-right.
- **Cancel.** A `button.destructive` "Cancel generation" is always visible. Clicking it opens a confirmation modal (because losing 15 minutes of work without confirmation is hostile).
- **Submit a chat message.** The chat panel is accessible during generation. Messages submitted here are queued and will be acted on by the agent at the next iteration boundary - the chat shows a "Will incorporate in next pass" pill on queued messages.
- **Expand any stream row.** Clicking a row reveals the agent's actual reasoning, tool input, tool output. Power users will read these; casual users will not. Both are accommodated.
- **Hover any frame thumbnail.** Frame thumbnails zoom on hover; clicking opens a larger preview.

### 15.3 Visual Pacing

The stream must feel alive. The agent's work is unevenly paced - sometimes it produces three tool calls in five seconds, sometimes it sits for ninety seconds while a render completes. We compensate visually:

**During fast bursts (multiple rows per second):**
The rows still animate in individually with `motion.message-arrive`, but the stagger is reduced so the burst feels like a burst.

**During slow patches (90 seconds with no new rows):**
We avoid a literal "nothing happening" feel. The most recent row pulses subtly - a barely-visible 1% opacity oscillation over 2-second cycles. The progress bar continues to creep forward by small fractions. The header text rotates through a small set of pacing labels ("Composing", "Refining", "Iterating") every 12 seconds.

We never insert fake activity. The user can always trust that a stream row reflects actual work.

### 15.4 ETA and Honesty

The ETA shown in the footer is honest. If the agent has historically taken 18 minutes for similar-size sites, we say "12 minutes remaining" at the start and update as we learn. We never round down to look better. If a generation looks like it will exceed 20 minutes, we show "longer than usual" in the header and a "Why?" affordance that explains.

### 15.5 Completion

When generation completes, the user is taken from the stream view to the editor. The transition:
- The minimised PIP appears bottom-right, holding the completed stream
- The editor surface fades in over 320ms
- The doc panel slides in from the right with the generation summary (if produced)
- A toast appears bottom-centre: "Generation complete" with an "Open editor" action (in case the user is still on the dashboard via the PIP)

If generation fails:
- The stream view does not disappear
- The header shifts to "Generation failed" with a `semantic.error` indicator
- The last row in the stream shows the error
- Two actions appear: "Retry" (re-runs with the same input) and "Adjust and retry" (opens the project setup to let the user modify the input)

---

## 16. Realtime Streaming Document Pattern (Claude-style)

When the agent writes a document (a generation summary, an export checklist, a brand brief), the document streams into a right-side panel as it is written. This pattern echoes Claude's artifact streaming behaviour and is one of the most distinctive UX moments of Scene24.

### 16.1 Pattern Description

1. **Trigger.** The agent's reasoning indicates it will produce a document. A `stream.row` arrives in the generation log: "Writing summary document". The doc panel begins to slide in from the right (`motion.slide-in-from-right`, 320ms).
2. **Initial state.** The doc panel header shows a streaming pill ("Writing..."). The panel body is empty.
3. **Streaming.** As the agent produces document content, each line of markdown arrives and is rendered. Headings, paragraphs, lists, code blocks - all stream in. New lines arrive at the bottom of the visible area; the panel auto-scrolls to keep the latest content visible. The user can scroll up to read earlier content; if they do, auto-scroll is paused (a "Jump to bottom" floating button appears).
4. **Inline tool-call rows.** If the agent uses a tool while writing the doc (e.g. to verify a fact), an inline `chat.tool-call-row` appears in the doc - collapsed by default, expandable. After the tool completes, the doc continues writing.
5. **Completion.** The streaming pill in the header animates to a "Complete" success pill. The auto-scroll stops. A "Copy doc" action appears in the header. The user can now read the full document.
6. **Persistence.** The doc panel persists. It can be closed (cmd+W or the close icon), in which case the doc is saved to the project's docs list and can be reopened later from the project sidebar.

### 16.2 Document Types

Three types of documents stream during a typical Scene24 session:

**Type 1: Generation summary.** Written when generation completes. Contains: input URL, beats produced, motion patterns used, render time, any issues encountered. Useful for the user to understand what the agent did.

**Type 2: Iteration report.** Written if the agent self-critiques and revises. Contains: the issues found in the first render, the fixes applied, the result. The user can compare before/after frames.

**Type 3: Export checklist.** Written before a final MP4 export. Contains: rendering specs, expected file size, estimated render duration. Has an inline "Confirm and export" button at the bottom.

### 16.3 Multiple Documents

A project can have multiple docs over its lifetime. The doc panel header has a small dropdown to switch between docs in the current project. Each doc is timestamped and titled (from its first heading).

### 16.4 Doc Panel Layout

See `doc.panel` in Section 13.13 for component spec. Width default 420px, resizable. The doc panel and the inspector panel share the right zone of the editor - both can be open at once, stacking vertically with a 4px resizable divider between them. The user can drag the divider to give more space to either.

### 16.5 Streaming Performance

Streamed text arrives at variable rates depending on the model. We render text as it arrives without waiting for newline or sentence boundaries - each token appears immediately. This makes the doc feel like a thoughtful person typing rather than a chunked machine output. The user reads at their reading speed; the doc fills below the read line.

---

## 17. Editor Composition Pattern (Figma-style inspector + chat)

The editor is where the user spends most of their working time. It must support two distinct interaction modes simultaneously - direct manipulation (Figma-style) and conversational (Claude-style) - without forcing the user into either.

### 17.1 The Three-Zone Editor

The editor has three zones plus a top toolbar and bottom timeline:

```
+--------------------------------------------------------+
|                   EDITOR TOOLBAR                       |   56px
+--------+---------------------------+-------------------+
|        |                           |                   |
|        |                           |                   |
|        |                           |                   |
|  CHAT  |          CANVAS           |    INSPECTOR /    |
| 380px  |     (flex, centred)       |     DOC PANEL     |
|        |                           |       420px       |
|        |                           |                   |
|        |                           |                   |
+--------+---------------------------+-------------------+
|                  BEAT TIMELINE                         |   88px
+--------------------------------------------------------+
```

**Left zone: Chat (380px default, resizable 320-560px).**
The chat panel. Always visible. Holds the conversation with the agent across all editing sessions.

**Centre zone: Canvas (absorbs remaining space).**
The video preview. The current beat plays here; the user can scrub the timeline to see any frame.

**Right zone: Inspector + Doc Panel (420px default, resizable 360-640px).**
When a canvas object is selected: the inspector for that object.
When generation produces a doc: the doc panel.
When both are present: they stack vertically with a resizable divider.

**Top toolbar:** project name, undo/redo, play/pause, share, export. Floats above canvas with soft shadow.

**Bottom timeline:** the beat row, the playhead, the timecode ruler.

### 17.2 Selection and Context

When the user clicks an object on the canvas:
- The object gets a copper selection halo (`canvas.object-selection`)
- The inspector panel opens (or refreshes) with the object's properties
- The chat input pre-populates with a context chip: "Selected: object-name". The user can then type a chat message about that object. If they delete the chip, the next chat message will be treated as a general/global message.

When the user submits a chat message referencing an object by description ("the headline at the top"):
- The agent identifies the object and modifies the TSX
- The doc panel may stream a brief iteration note
- The modified object gets a brief copper pulse on the canvas (a 200ms scale 1.04 then back to 1) so the user can see what changed
- The inspector updates to show the new property values

### 17.3 Direct Manipulation

Direct manipulation on the canvas:
- **Click an object** to select it
- **Drag an object** to reposition it - the change is committed on drop
- **Drag a corner handle** to resize - the change is committed on drop
- **Right-click for quick actions** - reset to default, copy properties, etc.
- **Cmd-click multiple objects** to multi-select (rare, but supported)

All direct manipulations show snap lines when applicable (Section 12.4).

### 17.4 Inspector Editing

The inspector shows every property of the selected object. Categories:
- Geometry (position, size, rotation)
- Appearance (opacity, color, border radius)
- Animation (enter/exit animations, duration, easing)
- Beat (which beat the object belongs to, beat duration)

Each property is editable via:
- A numeric scrub field (drag to change value)
- A direct text input (click to enter exact value)
- For colour, a swatch + hex input
- For easing, a bezier curve editor

### 17.5 Mode Switching Without Friction

The user can move between chat and direct manipulation freely. There is no "mode" the user is in; both interaction modes are always available. We expect users to:
- Start a session with chat ("make the hook punchier")
- Get a result they like
- Use direct manipulation to fine-tune ("move this 5px down")
- Use chat again for a higher-level change ("now the colours feel cold")
- Use direct manipulation again

The pattern is dialogue-based-iteration with manipulation polish. This matches the actual creative workflow of editing.

### 17.6 The Hidden Inspector State

Some inspector properties are not exposed by default - they live in an "advanced" expand of each group. This keeps the inspector approachable for non-power users (just position, size, animation) while making the full Remotion parameter set available for users who want it.

### 17.7 Undo/Redo

Every change - whether from chat or direct manipulation - is undoable. Cmd-Z reverts. Cmd-Shift-Z redoes. Undo history persists for the session; on session reload, the most recent saved state is loaded but undo history is reset.

Undo of a chat message reverts the underlying changes the agent made; the chat message itself remains visible (so the user can see the rejected change in context).

---

## 18. Auth Flow (Google, Apple, GitHub)

Scene24 offers exactly three auth providers. There is no email/password option. The reason: we are an opinionated product for serious users, and managing password resets, breach notifications, and 2FA enrolment for password users is engineering work that does not improve our product. The three social providers cover essentially all our target users.

### 18.1 Auth Surface

The auth page is at `/auth`. Layout described in Section 14.3.

### 18.2 Provider Order

Top to bottom: Google, Apple, GitHub. This order is set by:
- Google: largest active user base, lowest friction
- Apple: required for iOS users
- GitHub: most-relevant for our technical audience (developers building startups)

The order does not change between visits. We do not personalise the order based on inferred provider.

### 18.3 First-Time Sign-In

On first sign-in via any provider:
- We receive name and email
- We create the user record
- We redirect to a one-screen "Welcome" surface that asks for two pieces of info:
  - "What are you using Scene24 for?" (free-text, 1 sentence) - this is captured for product analytics but is not required
  - "Workspace name" - defaults to the user's first name + "'s workspace"
- On submit, the user lands on Dashboard with one starter project pre-created (an empty project with a sample URL)

### 18.4 Returning Sign-In

On returning sign-in:
- Provider button click triggers OAuth
- We verify the auth and redirect straight to Dashboard
- No additional welcome screen

### 18.5 Locale Detection

On first sign-in, we detect the user's browser locale and pre-select Korean or English. The user can change this at any time via the locale switcher in the footer (Section 19).

### 18.6 Account Linking

If a user signs in with Google one day and Apple another, we treat them as separate accounts unless the email matches exactly. If the email matches, we offer to link the accounts on the second sign-in. Account linking is opt-in and surfaces as a modal.

### 18.7 Sign-Out

Sign-out lives in the account avatar dropdown (top-right of the app nav). Clicking opens a small menu with: "Account settings", "Workspace settings", "Sign out". Sign-out is one click - no confirmation modal. The user lands on the landing page.

---

## 19. Internationalization (Korean and English)

Scene24 ships with full Korean and English support from day one. The product is built in a Korean-language startup ecosystem (Korea University) and targets both domestic and international users.

### 19.1 Locale Switcher

The locale switcher is a `toggle.pill-group` with two options: "EN" and "KR". It sits in three places:
- The marketing footer (visible without sign-in)
- The account settings page (after sign-in)
- The auth page (small switcher at the top-right)

Switching the locale changes all UI text immediately. URLs do not change (we use the same routes for both locales).

### 19.2 Translation Strategy

We use `next-intl` (or equivalent for the chosen framework) for i18n. All strings live in two JSON files: `en.json` and `kr.json`. There are no untranslated strings.

Strategy for translation:
- All UI strings are professionally translated, not machine-translated
- Marketing copy in Korean is written natively (not a translation from English) - the Korean voice is its own brand voice, not a derivative
- Technical labels (component names in design system, console errors) remain in English even in the Korean UI - this is a deliberate choice that matches Korean developer convention
- Date and time formats follow locale conventions: "May 14, 2026" vs "2026년 5월 14일"
- Numbers use locale-appropriate separators: "1,234.56" vs "1,234.56" (Korean and English use the same Western numerals; the format is consistent)

### 19.3 Korean Typography Considerations

Korean text has different rhythm and density requirements than English. We make these adjustments:

**Body line-height:** Korean body text uses line-height 1.7 (vs 1.55 for English) because Hangul characters need more vertical breathing room.

**Display tracking:** Korean display headlines use 0 letter-spacing (vs negative tracking for English). The Pretendard font is designed for this and looks wrong with negative tracking.

**Character lengths:** Korean is typically 1.3x more compact than English by character count but 1.1x looser by visual width. UI text must accommodate this - buttons that fit "Continue" in English must fit "계속하기" in Korean.

**Font fallback:** As specified in Section 6.1, Pretendard Variable is the Korean font, falling back to Noto Sans KR. Pretendard matches Inter's humanist proportions better than any other Korean web font.

### 19.4 Bilingual Copy Examples

| English | Korean |
|---|---|
| Continue with Google | Google로 계속하기 |
| New project | 새 프로젝트 |
| Export MP4 | MP4 내보내기 |
| Generation complete | 생성 완료 |
| Watch the agent work | 에이전트의 작업을 지켜보세요 |
| Make it punchier | 더 강렬하게 만들어줘 |

The Korean copy is calibrated to feel native, not translated. "더 강렬하게 만들어줘" reads as a creator talking to their tool, not as a transliteration of "make it punchier".

### 19.5 Voice Notes

In English, Scene24's UI voice is direct and slightly editorial - it does not over-explain, it does not use exclamation marks, it speaks to a sophisticated creator.

In Korean, the voice uses 반말-like directness within the chat panel (because the user is talking to their tool), but switches to 존댓말 for marketing copy and confirmations (because we are talking to a customer). This split mirrors how Korean people actually use the two registers.

---

## 20. Responsive Behavior

### 20.1 Breakpoints

| Name | Width | Key changes |
|---|---|---|
| Mobile small | <380px | Single column everything, hero h1 drops to 36px, chat panel becomes full-screen overlay |
| Mobile | 380-639px | Single column, hero h1 44px, dashboard cards 1-up |
| Tablet | 640-1023px | Hero h1 56px, dashboard cards 2-up, editor accessible but compressed |
| Desktop small | 1024-1279px | Full feature; editor's right zone may auto-collapse to compact mode |
| Desktop | 1280-1535px | Full feature, all three editor zones at default widths |
| Desktop wide | >=1536px | Full feature, generous outer margins, content max-widths cap |

### 20.2 Editor on Mobile

The editor is primarily a desktop surface. On mobile (<1024px), we restrict editing to a compact mode:
- The three-zone layout collapses to a tabbed single-zone view: tabs for Chat, Canvas, Inspector
- The user can swipe between tabs
- Direct manipulation on the canvas is touch-driven - tap to select, long-press to drag, pinch to zoom
- Some power-user features (multi-select, drag-to-reorder timeline) are disabled

We do not consider this the primary editor experience. We recommend desktop for serious editing in the onboarding flow.

### 20.3 Marketing on Mobile

The marketing surfaces work fully on mobile. Hero, features, pricing, footer all collapse to single column. The mini-player loop on the hero stays - it scales down to fit.

### 20.4 Dashboard on Mobile

Dashboard works fully on mobile. Project cards stack 1-up. The "New project" CTA becomes a sticky bottom action button.

### 20.5 Generation Stream on Mobile

The generation stream is mobile-friendly. The stream rows stack normally. Frame thumbnails are smaller. The minimised PIP is supported on mobile but appears smaller (280x160 instead of 360x200).

### 20.6 Touch Targets

All touch targets meet WCAG AA: minimum 40x40px. Most are 44x44px. The `button.primary` is 40px tall but with generous horizontal padding, making the visual hit area generous.

### 20.7 Scroll Behavior

We use native scroll on all surfaces. No scroll-hijacking, no parallax effects (we are not a portfolio site). On marketing pages, sections separate by spacing alone; no "snap to section" scroll. On the editor, the canvas does not scroll; the chat thread scrolls; the timeline can scroll horizontally if the video is longer than the timeline width.

---

## 21. Accessibility

### 21.1 Standards

Scene24 targets WCAG 2.1 AA. We are not formally certifying compliance at launch but the system is designed against the AA standard.

### 21.2 Colour Contrast

All text-on-surface combinations meet AA contrast. We have audited:

| Combination | Ratio | Status |
|---|---|---|
| `paper.ink` on `paper.canvas` | 14.2:1 | AAA |
| `paper.ink-muted` on `paper.canvas` | 7.8:1 | AAA |
| `studio.ink` on `studio.canvas` | 13.4:1 | AAA |
| `studio.ink-muted` on `studio.canvas` | 6.2:1 | AA Large, fail AA Normal - used only for label and secondary text larger than 14px |
| `studio.ink-faint` on `studio.canvas` | 3.8:1 | AA Large only - used only for fine-print and disabled |
| `accent.copper` on `paper.canvas` | 4.6:1 | AA |
| `accent.copper` on `studio.canvas` | 4.1:1 | AA |
| `studio.ink` on `accent.copper` | 4.1:1 | AA - the primary button text |

`studio.ink-muted` failing AA Normal is intentional - we use it only for text 14px or larger where AA Large applies (3:1 minimum). The faint variant is reserved for fine-print which is exempt under WCAG.

### 21.3 Focus Indicators

All interactive elements have visible focus rings (Section 9.2, `elevation.focus-ring`). The focus ring is 4px wide, copper, 16% alpha - clearly visible against any background. Keyboard users can always see where they are.

### 21.4 Keyboard Navigation

The product is fully keyboard-navigable. Tab order is logical (left-to-right, top-to-bottom). Section 12.2 specifies key bindings.

### 21.5 Screen Reader Support

All meaningful UI elements have ARIA labels. The streaming generation log uses `aria-live="polite"` so screen readers announce new stream rows. The chat panel uses `aria-live="polite"` for new messages. Document content is plain HTML with semantic heading tags.

### 21.6 Reduced Motion

The full motion system honours `prefers-reduced-motion: reduce`. In reduced motion mode:
- All transitions become instant
- Slide-in animations become a 100ms opacity fade
- The brand mark ambient rotation is disabled
- The auth atmosphere wash drift is disabled
- Beat thumbnail hover scale is disabled
- The stream pulse on slow patches is disabled

### 21.7 Form Validation

Form errors are announced via ARIA live regions. The error text is read by screen readers in addition to being visually displayed. Required fields are marked with both visual (`type.label-sm` "Required") and ARIA (`aria-required`).

### 21.8 Video Player Accessibility

The video player supports:
- Keyboard controls (space for play/pause, arrows for scrub)
- Captions (when present in the generated video)
- Volume controls (always visible)
- Fullscreen toggle (F key, also clickable)

---

## 22. Implementation Guide

### 22.1 Stack

The design system assumes the following implementation stack:

- **Framework:** Next.js 15 with App Router
- **Styling:** Tailwind CSS 4 with custom theme configuration; CSS variables for tokens
- **Components:** custom-built primitives, optionally using Radix UI for low-level a11y primitives (dialog, dropdown, popover)
- **Motion:** Framer Motion for complex animations; CSS transitions for simple state changes
- **Icons:** custom SVG icon library shipped as React components
- **i18n:** next-intl
- **Type:** locally hosted Inter Variable, Source Serif 4 Variable, JetBrains Mono Variable, plus Pretendard via CDN

### 22.2 CSS Variable Setup

All design tokens are exposed as CSS variables on the root element. Two-mode theming is achieved through a `data-theme` attribute on the html element:

```css
:root[data-theme="paper"] {
  --canvas: #f7f5f0;
  --surface-1: #efece5;
  --surface-2: #e8e4db;
  --surface-3: #dfdacf;
  --surface-pressed: #ebe7df;
  --hairline: rgba(19, 17, 15, 0.08);
  --hairline-strong: rgba(19, 17, 15, 0.16);
  --ink: #13110f;
  --ink-strong: #000000;
  --ink-muted: #5f5b54;
  --ink-faint: #928d83;
}

:root[data-theme="studio"] {
  --canvas: #13110f;
  --surface-1: #1a1816;
  --surface-2: #221f1c;
  --surface-3: #2b2823;
  --surface-pressed: #0e0d0b;
  --hairline: rgba(247, 245, 240, 0.06);
  --hairline-strong: rgba(247, 245, 240, 0.12);
  --ink: #f7f5f0;
  --ink-strong: #ffffff;
  --ink-muted: #a8a39a;
  --ink-faint: #6e6960;
}

:root {
  --accent: #c8744a;
  --accent-soft: #e2a386;
  --accent-pressed: #a35d39;
  --accent-on-dark: #e0966a;
  --accent-glow: rgba(200, 116, 74, 0.16);
  --semantic-success: #5b9a78;
  --semantic-warn: #c79443;
  --semantic-error: #c25548;
}
```

The editor surface forces `data-theme="studio"` regardless of system preference. The marketing and dashboard surfaces use `data-theme="paper"`. There is no user-controlled theme toggle - the theme is page-context-driven.

### 22.3 Component Primitive Architecture

Components are organised in three tiers:

**Tier 1: Primitives.** Headless behavioural components (Dialog, Popover, Dropdown) using Radix UI under the hood. These provide accessibility and keyboard handling for free.

**Tier 2: Styled components.** Our visual implementations of primitives - Button, Input, Card, etc. These wrap the primitives and apply our visual tokens.

**Tier 3: Composite components.** Higher-order components like ChatPanel, GenerationStream, DocPanel that compose styled components into product surfaces.

### 22.4 Motion Implementation

For simple state transitions (hover, press, focus), use CSS transitions:

```css
.button-primary {
  transition: background-color var(--duration-quick) var(--ease-standard),
              transform var(--duration-quick) var(--ease-standard),
              box-shadow var(--duration-base) var(--ease-standard);
}
```

For complex animations (slide-in panels, page transitions, stream row arrival), use Framer Motion with named variants matching the motion tokens:

```tsx
const slideInFromRight = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.32, ease: [0.3, 0, 0, 1.2] } },
  exit: { x: "100%", opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};
```

### 22.5 Icon Pipeline

SVG icons live in `/icons` as individual files. A build script generates a barrel export that wraps each icon as a React component with stroke-width and size props:

```tsx
<Icon.Home size={16} />
<Icon.Settings size={24} strokeWidth={2} />
```

All icons inherit color via `currentColor`. The auth provider icons are excluded from this pattern - they ship with embedded brand colours.

### 22.6 Streaming Performance

The generation stream and the doc panel receive content via Server-Sent Events. Streamed content is appended to the DOM without React re-rendering the entire stream:
- We use a virtualised list (e.g. `@tanstack/react-virtual`) for the stream rows
- New rows are added to the bottom of the virtualised range and animated in
- The doc panel uses a markdown renderer that streams tokens directly without re-parsing the full document

For the doc panel specifically, we render markdown progressively - as each block-level element completes (a heading finishes, a paragraph finishes, a code block closes), we re-render only that block.

### 22.7 Asset Optimisation

- Brand icons and SVGs are inlined via the icon barrel
- Hero video loops on the landing page are 4-second WebM with VP9 encoding, max 1.5MB per loop
- Frame thumbnails in the generation stream are 200px wide JPEG at quality 80, lazy-loaded
- All custom fonts are subsetted to Latin + Korean characters and self-hosted with `font-display: swap`

### 22.8 Testing Strategy

For the design system:

- **Visual regression:** Chromatic or Percy on the component library
- **A11y:** axe-core in Storybook stories
- **Motion:** manual review only - we do not automate motion testing
- **Cross-locale:** screenshot tests for both EN and KR for every page

---

## 23. Token Reference Sheet

This section is the single source of truth for token values. Cross-reference this when implementing.

### Color Tokens (REVISED - post-Claude differentiation)

```css
/* Studio Dark - revised to slightly cooler dark for Claude differentiation */
--studio-canvas: #0c0d0f;
--studio-surface-1: #15161a;
--studio-surface-2: #1d1f24;
--studio-surface-3: #262830;
--studio-surface-pressed: #08090b;
--studio-hairline: rgba(244, 237, 224, 0.06);
--studio-hairline-strong: rgba(244, 237, 224, 0.12);
--studio-ink: #f4ede0; /* Now matches paper.canvas - reverse mode coherence */
--studio-ink-strong: #ffffff;
--studio-ink-muted: #a8a094;
--studio-ink-faint: #6e6760;

/* Paper Light - revised to warmer beige for Claude differentiation */
--paper-canvas: #f4ede0; /* warmer beige than Claude cream */
--paper-surface-1: #ece4d4;
--paper-surface-2: #e3dac7;
--paper-surface-3: #d9cfb9;
--paper-surface-pressed: #e8e1cf;
--paper-hairline: rgba(28, 23, 16, 0.08);
--paper-hairline-strong: rgba(28, 23, 16, 0.16);
--paper-ink: #1c1710;
--paper-ink-strong: #000000;
--paper-ink-muted: #6b6353;
--paper-ink-faint: #9b9281;

/* Accent - revised to more saturated Pumpkin-influenced copper */
--accent-copper: #e0763a;
--accent-copper-soft: #f0a880;
--accent-copper-pressed: #b85d28;
--accent-copper-on-dark: #f08750;
--accent-copper-glow: rgba(224, 118, 58, 0.18);

/* Optional Sub-Accent (Charcoal) - poster moments only */
--accent-charcoal: #2a2520;

/* Semantic */
--semantic-success: #5b9a78;
--semantic-warn: #c79443;
--semantic-error: #c25548;

/* Atmosphere (auth only) */
--atmosphere-warmth: #e8b89a;
--atmosphere-depth: #3a2e26;
```

### Typography Tokens

```css
--font-sans: "Inter Variable", "Inter", "Pretendard Variable", "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif;
--font-serif: "Source Serif 4 Variable", "Source Serif 4", "Pretendard Variable", "Noto Sans KR", Georgia, serif;
--font-mono: "JetBrains Mono Variable", "JetBrains Mono", "SF Mono", "Roboto Mono", Consolas, monospace;
--font-feature-sans: "cv11" 1, "ss03" 1, "tnum" 1;

/* Type ramps (size / weight / line-height / letter-spacing) */
--type-hero: 72px / 500 / 1.02 / -0.04em;
--type-display-xl: 56px / 500 / 1.05 / -0.035em;
--type-display-lg: 44px / 500 / 1.08 / -0.03em;
--type-display-md: 32px / 500 / 1.12 / -0.025em;
--type-display-sm: 24px / 500 / 1.18 / -0.02em;
--type-title-lg: 20px / 600 / 1.25 / -0.012em;
--type-title-md: 17px / 600 / 1.35 / -0.008em;
--type-title-sm: 15px / 600 / 1.4 / -0.005em;
--type-body-lg: 17px / 400 / 1.55 / -0.005em;
--type-body-md: 15px / 400 / 1.55 / -0.003em;
--type-body-sm: 13px / 400 / 1.5 / 0;
--type-label-md: 13px / 500 / 1.3 / 0.01em;
--type-label-sm: 12px / 500 / 1.3 / 0.02em;
--type-eyebrow: 11px / 600 / 1.2 / 0.08em (uppercase);
--type-micro: 11px / 400 / 1.3 / 0.01em;
--type-mono-md: 13px / 400 / 1.5 / 0;
--type-mono-sm: 12px / 400 / 1.45 / 0;
--type-mono-xs: 11px / 500 / 1.3 / 0;
```

### Spacing Tokens

```css
--space-0: 0;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 32px;
--space-8: 40px;
--space-9: 56px;
--space-10: 72px;
--space-11: 96px;
--space-12: 128px;
```

### Radius Tokens

```css
--radius-0: 0;
--radius-xs: 4px;
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 10px;
--radius-xl: 14px;
--radius-2xl: 20px;
--radius-3xl: 28px;
--radius-pill: 9999px;
--radius-full: 50%;
```

### Motion Tokens

```css
--duration-instant: 0ms;
--duration-quick: 120ms;
--duration-base: 200ms;
--duration-relaxed: 320ms;
--duration-slow: 480ms;
--duration-deliberate: 800ms;

--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-emphasised: cubic-bezier(0.3, 0, 0, 1.2);
--ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
--ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
```

### Elevation Tokens

```css
--shadow-float-soft: 0 8px 24px rgba(19, 17, 15, 0.12), 0 1px 3px rgba(19, 17, 15, 0.08);
--shadow-float-strong: 0 16px 48px rgba(19, 17, 15, 0.24), 0 2px 6px rgba(19, 17, 15, 0.12);
--shadow-focus: 0 0 0 4px var(--accent-copper-glow);
--backdrop-modal: rgba(19, 17, 15, 0.6);
--backdrop-modal-blur: 8px;
```

---

## 24. Apple Liquid Glass System - Constrained Usage

Apple introduced the Liquid Glass design language across iOS 26 and macOS 26 in 2025. The effect is real translucency with refraction, dynamic saturation, and edge highlights - not the flat frosted-glass that the glassmorphism trend converged on. Scene24 adopts Liquid Glass in selective, high-value moments only. Used everywhere, the effect is a glassmorphism cliche; used in two or three places per surface, it reads as polished native-app craft.

### 24.1 Where Liquid Glass Is Allowed

Three contexts only:

**Context 1: The editor's floating top toolbar.**
The toolbar floats over the video canvas. Liquid Glass gives the toolbar real translucency that lets the video colour bleed through subtly, signalling "I am above the working surface". This is the highest-value Liquid Glass application in the product.

**Context 2: The primary CTA on critical surfaces.**
The "Export MP4" button in the editor, the "Continue" button in the auth flow, the "Generate" button on the home hero. These are moments where the brand wants to invest visual polish.

**Context 3: Dropdown menus and context menus over canvas content.**
When a menu opens over the editor canvas, Liquid Glass keeps the canvas visible underneath at low opacity. Standard surface-1 background would block the canvas entirely and break the user's spatial awareness.

### 24.2 Where Liquid Glass Is Forbidden

Liquid Glass is **not** applied to:
- All standard cards (project cards, feature cards, pricing cards)
- Standard buttons (secondary, ghost, icon)
- Inputs of any kind
- Modals (use `shadow.3` and surface-1 instead)
- Sidebars and panels
- Navigation (nav uses solid canvas with surface lift)
- Any list rows
- Marketing surfaces in general (Paper Light)

Liquid Glass appears at most three times per visible viewport. If you find yourself reaching for it a fourth time, the design is wrong.

### 24.3 Technical Implementation

Liquid Glass requires combining four CSS/SVG techniques in a precise stack. We implement via the `liquid-glass-react` library (https://github.com/rdev/liquid-glass-react) as the production primitive, with manual CSS+SVG fallback for elements outside React render trees.

**Production library:**

```tsx
import LiquidGlass from "liquid-glass-react";

<LiquidGlass
  displacementScale={36}
  blurAmount={12}
  saturation={180}
  aberrationIntensity={2}
  elasticity={0.4}
  cornerRadius={14}
>
  <button className="px-4 py-2 text-ink">Export MP4</button>
</LiquidGlass>
```

Parameter calibration for Scene24:
- `displacementScale: 36` - the strength of the SVG displacement-map distortion. We use 36 as the brand standard. Higher reads as "watery"; lower reads as "flat".
- `blurAmount: 12` - backdrop blur in pixels. Lower than typical glassmorphism (which goes 20-40) - we want translucency, not full obscurity.
- `saturation: 180` - increases colour saturation of the background visible through the glass. The Apple effect specifically uses elevated saturation.
- `aberrationIntensity: 2` - chromatic aberration at the edges. Subtle. Above 4 reads as broken.
- `elasticity: 0.4` - cursor-follow elasticity for the highlight band. Apple's iOS 26 has cursor-aware highlights that elastically follow the pointer. 0.4 is "subtle but present".
- `cornerRadius: 14` - matches our `radius.xl` card radius for buttons and toolbar; use 20 for modals if Liquid Glass is ever applied to a modal (rare).

**Manual CSS+SVG fallback (for non-React contexts or animation-heavy cases):**

```html
<svg style="position: absolute; width: 0; height: 0;">
  <filter id="liquid-glass-distortion">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.012" numOctaves="2" seed="3"/>
    <feGaussianBlur in="SourceGraphic" stdDeviation="0.8"/>
    <feDisplacementMap in="SourceGraphic" scale="36"/>
  </filter>
</svg>

<div class="liquid-glass-element">
  <!-- content -->
</div>

<style>
.liquid-glass-element {
  backdrop-filter: url(#liquid-glass-distortion) blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%); /* Safari fallback - no displacement */
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    0 8px 24px rgba(19, 17, 15, 0.08);
}
</style>
```

**The four-layer composition (this is what makes it actually Apple-grade, not generic glass):**

1. **Backdrop displacement** via SVG `feTurbulence` + `feDisplacementMap` - this is the refraction that makes the underlying content slightly distorted, like looking through curved glass. Without this, you have flat frosted glass, which is the glassmorphism cliche.
2. **Backdrop blur and saturate** via CSS `backdrop-filter` - 12px blur and 180% saturation are the Apple values.
3. **Inner highlight** via `box-shadow inset 0 1px 0 rgba(255,255,255,0.15)` - a 1px-tall white highlight at the top edge of the element, simulating light hitting the top of a glass piece. Without this, the element looks like a hole in the canvas.
4. **Outer soft shadow** matching `shadow.2` or `shadow.3` - grounds the element so it appears to be physically above the canvas.

All four layers together = Liquid Glass. Any subset of them = glassmorphism cliche.

### 24.4 Browser Support and Fallback

Liquid Glass with SVG displacement only works on Chromium. Safari and Firefox do not support SVG filters as input to `backdrop-filter`. Fallback:

```css
@supports not (backdrop-filter: url(#liquid-glass-distortion)) {
  .liquid-glass-element {
    background-color: rgba(28, 23, 16, 0.72); /* Solid fallback */
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
  }
}
```

On Safari and Firefox, users see frosted glass without the refraction distortion. This is acceptable degradation. The element still functions, still feels translucent, just lacks the Apple-specific refraction.

### 24.5 Performance

Liquid Glass with SVG displacement is GPU-expensive. Each instance costs ~2-3ms per frame on a low-end laptop. With three instances visible per viewport (our hard limit), total cost stays under 10ms per frame - safe for 60fps. If we ever exceed 3 instances, we measure frame time and adjust.

Animation on Liquid Glass elements (the cursor-follow elasticity) further increases cost. We disable elasticity (`elasticity: 0`) on the dropdown and context menu instances - they do not need cursor-aware highlights. Only the top toolbar and primary CTAs get full elasticity.

### 24.6 Visual Tuning for Scene24

The default Liquid Glass tint is colourless (transparent-grey). For Scene24, we tune the inner tint to be a fraction of `accent.copper-glow` so the glass picks up a barely-perceptible warm tone:

```css
.liquid-glass-element {
  background-color: rgba(224, 118, 58, 0.04); /* 4% copper tint */
  /* ...rest same as above */
}
```

This 4% copper tint is the difference between "generic Apple glass" and "Scene24 glass". The user does not consciously perceive the warmth, but the glass reads as part of our brand rather than as an Apple component bolted on.

---

## 25. UX Checklist - Web Production Standards

This checklist applies to every page in Scene24. Before any page ships, the implementing engineer or designer runs through this list and confirms each item. The checklist is grouped by user impact.

### 25.1 Performance

- [ ] First Contentful Paint under 1.8s on a mid-tier mobile device (Lighthouse mobile profile)
- [ ] Largest Contentful Paint under 2.5s
- [ ] Cumulative Layout Shift under 0.1 (no content jumping after load)
- [ ] Time to Interactive under 3.8s
- [ ] Total page weight under 1MB for marketing surfaces, under 2MB for product surfaces
- [ ] Custom fonts subset to required Unicode ranges only (no Hangul shipping with English-only pages and vice versa)
- [ ] Images served as WebP with JPEG fallback, sized to display dimensions, lazy-loaded below the fold
- [ ] Texture assets (noise PNGs) under 50KB each

### 25.2 Accessibility

- [ ] Every interactive element reachable via keyboard
- [ ] Tab order is logical (left-to-right, top-to-bottom)
- [ ] Focus state is visible on every focusable element - the copper focus ring at minimum
- [ ] Every image has `alt` text or `alt=""` for decorative images
- [ ] Every form field has an associated `<label>` (not just placeholder text)
- [ ] Required fields are marked with both visual indicator ("Required") and `aria-required`
- [ ] Error messages associated with fields via `aria-describedby`
- [ ] Live regions (`aria-live="polite"`) on streaming content (chat, generation stream)
- [ ] Modals trap focus, return focus to trigger on close
- [ ] Skip-to-main-content link at the top of every page
- [ ] Colour contrast ratios meet WCAG AA: 4.5:1 for body text, 3:1 for large text
- [ ] No information conveyed by colour alone (always paired with text or icon)
- [ ] `prefers-reduced-motion` honoured on all animations
- [ ] Tested with VoiceOver (macOS) and at least one Windows screen reader (NVDA recommended)
- [ ] axe-core or WAVE shows zero critical violations on the page

### 25.3 Content and Voice

- [ ] Every page has exactly one h1
- [ ] Heading hierarchy is sequential (h1 -> h2 -> h3, no skips)
- [ ] No placeholder content shipped ("Lorem ipsum", "TBD", "[Placeholder]")
- [ ] Date and time formatted per locale (English: "May 14, 2026"; Korean: "2026년 5월 14일")
- [ ] Numerics use tabular figures via `font-feature-settings: "tnum"`
- [ ] Body text is plain language, not jargon-heavy
- [ ] Error messages are actionable ("Add a URL to continue", not "Invalid input")
- [ ] Empty states use typographic explanation plus a single primary action (no hero illustrations)
- [ ] No emoji anywhere in product UI
- [ ] Locale-switcher present in footer or settings on every page

### 25.4 Interaction and Feedback

- [ ] Every interactive element has a hover state (where pointer is available)
- [ ] Every interactive element has a pressed state (scale 0.96 or surface drop)
- [ ] Every interactive element has a focus state (copper focus ring)
- [ ] Every form submission shows a loading state within 200ms of submit
- [ ] Long operations (>1s) show a progress indication
- [ ] Operations that take >20s offer a cancel action
- [ ] Successful operations show a toast or inline confirmation
- [ ] Failed operations show an error message at the relevant field or as a toast with a retry action
- [ ] All animations complete in under 480ms (page transitions) or under 200ms (state changes)
- [ ] No scroll-hijacking or parallax effects
- [ ] Touch targets minimum 40x40px, preferably 44x44px

### 25.5 Forms

- [ ] Validation happens on blur, not on every keystroke
- [ ] Required field marker is visible before the user attempts submission
- [ ] Submit button is disabled until required fields are filled (where validation can be done client-side)
- [ ] Pasting works in every text input (no `onPaste` blocking)
- [ ] Auto-fill works (correct `autocomplete` attributes on standard fields)
- [ ] Long-form inputs auto-save drafts every 5 seconds
- [ ] Confirm-before-discard on forms with unsaved changes
- [ ] Form labels are above inputs, not floating-label-style (floating labels are accessibility-hostile)

### 25.6 Mobile and Responsive

- [ ] Page works at 320px viewport width
- [ ] No horizontal scrolling on mobile
- [ ] Touch targets minimum 44x44px on mobile
- [ ] Body font size minimum 15px on mobile
- [ ] Forms do not zoom on focus (`font-size: 16px` minimum on inputs)
- [ ] Modals are full-screen on mobile, not centred boxes with backdrops
- [ ] Hamburger menu opens with a clear close affordance
- [ ] Bottom-sheet sliders dismiss with a swipe-down gesture

### 25.7 Internationalization

- [ ] All UI strings live in i18n files (no hardcoded strings)
- [ ] Korean and English strings reviewed by native speakers
- [ ] Layout accommodates Korean text length (typically 1.1x wider than English)
- [ ] Pretendard letter-spacing -2.5% applied to Korean text
- [ ] Korean body line-height set to 1.7 (vs 1.55 for English)
- [ ] Korean display tracking set to 0 (no negative, Pretendard runs tight by default)
- [ ] Date, time, number formats per locale
- [ ] Currency formatted per locale (USD vs KRW)

### 25.8 SEO and Sharing

- [ ] Every page has a unique `<title>` and `<meta description>`
- [ ] OpenGraph image set (1200x630) for social sharing
- [ ] Canonical URL set
- [ ] Sitemap submitted
- [ ] Robots.txt configured

---

## 26. UI Trends 2026 - Where Scene24 Lands

This section documents how Scene24 aligns with (or deliberately resists) the dominant UI/UX trends of 2026. It is informational - not prescriptive - and serves as a sanity check that our design decisions are not blindly tracking trend or blindly resisting it.

### 26.1 Trends Scene24 Embraces

**1. Texture Check (Noise / Grain / Tactile)**
The 2026 dominant trend per Canva's design research is "tactile" - subtle noise textures, grain overlays, paper feels. Search for "soft neutral backgrounds" and "tactile design" grew 30% YoY. Scene24 ships noise textures as a first-class atmospheric layer (Section 5.4.1).

**2. Apple Liquid Glass (Selective)**
Apple's Liquid Glass shipped in iOS 26 and is the most influential design language of 2025-2026. Scene24 adopts it in three constrained contexts (Section 24). The market signal is that polished apps now look "Liquid Glass-aware" - skipping it entirely reads as "didn't notice the OS update".

**3. Editorial / Kinetic Typography**
Display typography has become "the hero image". Variable fonts that respond to scroll, sound, or interaction. Scene24 ships Fraunces for editorial moments (5 places) and Geist Variable for body, both supporting variable axes. Wordmark uses Syne for distinctive identity.

**4. Anti-Vibe-Coding Movement**
A designer-led 2026 movement against AI-generated UI sameness. Scene24's brand position is explicitly anti-AI-cliche (Section 2). The product must read as "designed", not as "vibe-coded".

**5. Dark Mode as Working Mode**
Dark mode is no longer optional. For tools where the canvas matters (Figma, Linear, Cursor, video editors), dark is the working default. Scene24 ships Studio Dark as the editor default.

**6. Single Accent / Disciplined Palette**
The corporate trend toward "saturated multi-accent palettes" reversed in 2025-2026. The most-admired interfaces ship one accent (Linear blue, Anthropic coral, Vercel inverse). Scene24 ships one (copper).

### 26.2 Trends Scene24 Deliberately Resists

**1. Generative Bento Grids**
The "AI-generated 2x2 bento grid" with mixed-size cards became a 2024-2025 hero pattern, and per the anti-vibe-coding feedback, it is the most visible cliche of "AI-built site". Scene24's marketing pages use editorial horizontal-band layout, not bento.

**2. Glassmorphism (Overuse)**
The trend that "every card is frosted glass" - Scene24 limits Liquid Glass to three specific contexts and uses solid surface lift elsewhere.

**3. Pastel-Plus-Inter SaaS Aesthetic**
The visual default of post-2022 SaaS - pastel gradient hero + Inter body + generic feature cards. Scene24 ships Geist (not Inter), warm beige (not pastel), and editorial layout (not feature-card grids).

**4. AI Sparkle Iconography**
The 4-point star, the wand, the gradient ✨. Scene24 ships no AI-specific iconography.

**5. Decorative Live Indicators**
Pulsing dots labelled "Live" / "AI" / "Active". Scene24 uses typographic status labels.

**6. Vibe-Coded 8px Radius Everywhere**
The cliche of every element at the same 8px radius. Scene24 ships a 9-step radius scale with explicit per-component rules (Section 8).

### 26.3 Trends Scene24 Watches But Has Not Committed To

**1. Voice/Conversational Interfaces**
Voice-first product UX is trending but Scene24's domain (precision video editing) is poorly suited to voice. We monitor but do not adopt.

**2. AI Personalization Layers**
Adaptive UI that changes based on user behaviour. Powerful but ethically fraught - dark patterns hide here. Scene24 does not adopt adaptive layouts at launch.

**3. Spatial / 3D Interfaces**
WebGL/Three.js hero interactions trending in 2026. Scene24 has video as the hero artefact, which gives us motion and depth without needing 3D chrome.

---

## 27. Comprehensive AI Anti-Pattern Reference (extended)

Section 2 stated the philosophy. This section is the exhaustive enumeration. Every item below is a documented pattern that designers in 2026 identify as "AI-built". Scene24 ships **none** of these.

### 27.1 Visual Patterns That Scream AI-Built

| # | Pattern | Why it reads as AI |
|---|---|---|
| 1 | Translucent card with cyan-to-magenta gradient | The "VibeCode Purple" - the default Cursor/Replit/Bolt.new chat output |
| 2 | 4-point star ✨ icon for "AI" or "generate" | Vercel AI, Cursor, Perplexity all use this. Pure category cliche. |
| 3 | "Powered by AI" badge | Implies the product is novel because of AI. In 2026, AI is table stakes. |
| 4 | Pulsing dot labelled "Live" / "Active" | Default chatbot UI signal. Adds no information. |
| 5 | Glassmorphism card overuse (every card frosted) | The single biggest AI-built cliche per designer feedback |
| 6 | 8px corner radius on every element | The default in Tailwind starter templates that LLMs reach for |
| 7 | Inter font for everything | Inter became the default of every LLM-generated UI. Differentiates nothing. |
| 8 | 3-column feature grid with icons on top | Bolt.new, v0, Lovable all default to this. Mass-produced look. |
| 9 | Hero with "✨ Now in Beta" badge above headline | Badge-above-hero is generic SaaS template |
| 10 | Bento grid (2x2 with mixed-size cards) | AI-product 2024-2025 hero pattern, now a saturation point |
| 11 | Centred hero with gradient background blob | The default Vercel/Next.js template output |
| 12 | "Built with Next.js" footer disclosure | Tech-stack flexing reads as developer-built, not designed |
| 13 | Emoji in section headers | Casual-tone signal that AI tools default to |
| 14 | "AI is thinking..." spinner with 3 dots | The default loading state for every LLM chatbot |
| 15 | Card with `linear-gradient(135deg, #667eea, #764ba2)` | The Stripe-blue gradient that became default in every starter |
| 16 | Dark mode toggle in the top nav | If dark is the default, you don't need a toggle that screams "we have dark mode!" |
| 17 | Toast notifications stacked at top-right | Default Radix Toast position; designers move toasts to bottom-centre for craft |
| 18 | Generic illustration with abstract shapes | The undraw.co aesthetic - generic, unsigned, unmemorable |
| 19 | Hero with massive headline + tiny CTA | Inverted hierarchy - the CTA should be discoverable |
| 20 | Mascot with friendly cartoon eyes | Lovable's mascot trend - reads as consumer-toy |

### 27.2 Voice and Copy Patterns

| # | Pattern | Fix |
|---|---|---|
| 21 | "✨ Let's get started!" - exclamatory copy | Use direct copy. "Start generating" |
| 22 | "Hey there! 👋" greeting | Use a real time-aware greeting without emoji |
| 23 | "Oops! Something went wrong" error | Specific error: "Generation failed. Retry?" |
| 24 | "Coming soon" placeholder | Hide the feature entirely if not shipping |
| 25 | "We're excited to..." marketing intro | Excitement is for the user to feel, not for us to claim |
| 26 | "Powered by GPT-4 / Claude" disclosure | Model attribution belongs on the about page, not the chat surface |

### 27.3 Behavioural Anti-Patterns

| # | Pattern | Why it's harmful |
|---|---|---|
| 27 | Modal opens on page load to collect email | Hostile interrupt before user has assessed value |
| 28 | Newsletter popup after 5 seconds | Same as above, slightly delayed |
| 29 | Cookie consent modal that requires scroll-to-accept | Dark pattern - illegal in EU |
| 30 | Hidden unsubscribe link | Dark pattern - violates GDPR/CAN-SPAM |
| 31 | "Are you sure you want to leave?" beforeunload | User-hostile, browsers now ignore most |
| 32 | Auto-playing video on landing with sound | Universally hated |
| 33 | Scroll-hijacking that overrides browser scroll | Breaks accessibility |
| 34 | Custom cursor that lags behind real cursor | Adds nothing, breaks predictability |
| 35 | Infinite scroll without a footer | Hides the footer's information forever |

### 27.4 What Scene24 Ships Instead (positive enumeration)

| For | Anti-pattern | Scene24 |
|---|---|---|
| Brand identity | Inter + 4-point star + cyan accent | Geist + Syne wordmark + Fraunces accent + Copper |
| Card design | Frosted glass with gradient | Solid surface-lift + optional grain texture |
| Hero | "✨ Beta" badge above massive headline | Editorial layout, time-aware greeting, working CTA |
| Loading | "AI is thinking..." spinner | Streaming generation log with actual tool calls visible |
| Empty state | Hero illustration with cartoon shapes | Single typographic line + single CTA |
| Error | "Oops! Something went wrong" | Specific error + retry action |
| Settings | Hamburger menu with cog icon | Production-grade settings surface (Section 14.9) |
| Mobile | Responsive shrink with hamburger | Full mobile experience (Section 20) |
| Export | "Download" button with no options | Industry-standard export modal (Section 14.10) |

---

## 28. Multi-Track Timeline System (Video + Audio)

This section defines Scene24's timeline architecture. The product makes 15-60 second cinematic ads with beat-based structure plus optional layered video and audio tracks. The system borrows the multi-track concept from professional editors (Premiere, DaVinci, CapCut) but constrains it deliberately - we do not ship a Premiere clone because our user is not a professional editor managing a 90-minute timeline.

### 28.1 Two-Mode Timeline (Simple by Default, Pro on Demand)

The single most important decision: Scene24 ships two timeline modes and defaults to Simple. The user can expand to Pro mode at any time.

**Simple Mode (default):**
- The 5-beat horizontal card strip (already specified in Section 13.12)
- One row, 88px tall, beats sized proportionally to their duration
- Suitable for 80% of users who never need to think about layers
- Edit operations: reorder beats, change beat duration, swap beat transition

**Pro Mode (opt-in expansion):**
- Same beat strip on top (28px tall, compressed)
- Multi-track stack below (4 tracks max: V2 / V1 / A1 / A2)
- Per-track height: 56px
- Total timeline height: 28px (beat strip) + 4 × 56px (tracks) + 16px (ruler) = 268px
- Suitable for users who want to layer overlay text, swap audio, add VO

**Expand/collapse trigger:**
- A 32x24 icon button at the right edge of the Simple beat strip
- Icon: a "stack" glyph (3 horizontal lines, increasing in length)
- Click expands tracks below the beat strip with `motion.expand-accordion` over `duration.relaxed` (320ms)
- Collapse same animation in reverse
- The expand state persists per-project (saved to local storage)

This dual-mode approach is the Scene24 distinguishing decision. Most users get a simple, friendly editor. Power users get a real multi-track. Neither group feels squeezed.

### 28.2 Track Definitions

Pro Mode tracks (top to bottom):

| Track | Type | Default Content | Color Coding |
|---|---|---|---|
| `V2` | Video overlay | Text overlays, callout graphics, secondary visuals | `accent.copper` at 0.4 alpha |
| `V1` | Video main | Primary footage, beat backgrounds, device mockups | `studio.surface-2` (no color tint) |
| `A1` | Audio main | Background music, beat-driven audio | `semantic.success` at 0.4 alpha |
| `A2` | Audio secondary | Voiceover, SFX, custom audio | `semantic.warn` at 0.4 alpha |

Track color coding rules:
- Color tint applied to the track header background only (the 80px-wide left rail)
- Clip surfaces inside the track stay neutral (`studio.surface-2`) - the color signal is the track header
- Color coding is subtle (40% alpha) - it identifies the track without screaming

**Why only 4 tracks max:**
Premiere supports unlimited tracks. We constrain to 4 because:
1. 30-second cinematic ads don't need more than 2 video layers and 2 audio layers in practice
2. More tracks add UX complexity that 80% of users won't need
3. A constraint of "4 tracks" forces compositional discipline (each track has a clear job)
4. Pro users wanting more layers can use nested compositions (Section 28.6)

### 28.3 Track Header Anatomy

Each track has a fixed-width left header (80px wide, 56px tall) holding the track's controls.

```
+--------+--------------------------------------+
| HEADER |              TRACK CONTENT           |
| 80px   |             (clips + waveform)       |
+--------+--------------------------------------+
```

Header internal layout (top to bottom):
- Track label in `type.label-sm` (12px / 500 / 0.02em): "V2", "V1", "A1", "A2"
- Track name in `type.body-sm` ink-muted: "Overlay", "Main", "Music", "VO/SFX"
- Control row (3 icons): visibility eye, lock padlock, mute speaker (each 16x16)

Control states:
- Visibility: eye icon. Default visible. Click toggles to crossed-eye. Hidden tracks gray out their content area.
- Lock: padlock icon. Default unlocked. Click toggles to locked. Locked tracks cannot be edited (drag, resize, click are no-op).
- Mute (audio only): speaker icon. Default unmuted. Click toggles to crossed-speaker. Muted tracks play silently.
  - For video tracks (V2/V1), the third icon slot holds a "solo" button instead of mute - clicking solo isolates that video track for preview

Header background:
- Default: track's color tint at 0.4 alpha mixed with `studio.surface-2`
- Hover: tint at 0.6 alpha
- Selected (when any clip in the track is selected): tint at 0.8 alpha plus 1px right border in the tint color

### 28.4 Clip Visualization

Each clip on a track is rendered as a rounded rectangle.

**Video clip (`clip.video`):**
- Background: `studio.surface-3`
- Radius: `radius.md` (8px)
- Height: 48px (4px inset from track edges)
- Left and right edges have a 2px draggable handle for trim
- Content: a tiny thumbnail strip (the clip's first frame at 64x36) + clip name in `type.label-sm` truncated
- Selected state: 1px copper border + copper outer glow at `accent.copper-glow`
- Hovered state: surface lifts to a slightly brighter shade

**Audio clip (`clip.audio`):**
- Background: `studio.surface-3` with track's color tint at 0.15 alpha
- Radius: `radius.md` (8px)
- Height: 48px
- Content: SVG-rendered waveform at full width, plus clip name in `type.label-sm` overlaid
- Waveform color: track's color (full saturation) at 0.5 alpha
- Waveform amplitude: proportional to audio peak, rendered as vertical bars 2px wide with 1px gap
- Selected state: same as video clip

**Clip operations:**
- Click: select
- Drag body: move clip horizontally (snaps to beat boundaries by default; hold Alt to disable snap)
- Drag left/right edge: trim clip
- Right-click: context menu (Split at playhead, Duplicate, Delete, Properties)
- Double-click: open clip-specific inspector

### 28.5 Audio Waveform Generation and Rendering

Audio waveforms render in real-time from the audio file's peak data. We do not generate waveforms via raw PCM streaming (too expensive). Instead:

1. On audio file upload, the backend computes a peak array (~200 peaks per second) and stores it as JSON metadata
2. The client receives the peak array along with the audio URL
3. The waveform component renders peaks as vertical bars, scaled to the track height
4. As the clip's duration changes (trim), the bar count adjusts but the underlying peak data is fixed

Library: we use `wavesurfer.js` (https://wavesurfer-js.org/) for waveform rendering. It is the de-facto web audio waveform library, used by SoundCloud, Spotify Web, and Descript. Highly customizable, supports our color tokens, ~30KB gzipped.

```tsx
<WaveSurfer
  url={audioClip.url}
  peaks={audioClip.peaks}
  height={40}
  waveColor="rgba(91, 154, 120, 0.5)" // semantic.success at 50%
  progressColor="rgba(224, 118, 58, 0.8)" // accent.copper at 80% for played portion
  barWidth={2}
  barGap={1}
  barRadius={1}
  cursorWidth={0}
  interact={false}
/>
```

### 28.6 Beat Boundaries and Track Alignment

Beats define the temporal structure. Tracks live within beat boundaries but a clip can span multiple beats.

```
Beat strip:    [---hook---][--problem--][--solution--][--demo--][--cta--]
V2 (overlay):  [logo--][----text-overlay----]              [text--]
V1 (main):     [intro-shot--][--phone-zoom--][--screen-demo--][cta-shot]
A1 (music):    [bgm-track-spanning-entire-timeline--------------------]
A2 (VO):                     [voiceover-narration--------]
```

Clip-beat alignment:
- By default, clips snap to beat boundaries when dragged
- Hold Alt to drag freely (the snap line still shows where the nearest beat boundary is)
- A clip that crosses a beat boundary shows a subtle 1px hairline at the boundary inside the clip - signaling "this clip plays during beat X and beat Y"

### 28.7 Nested Compositions (Advanced)

For users who genuinely need more than 4 tracks, nested compositions allow a sub-timeline to be referenced as a single clip on the main timeline.

- A clip on V1 can be a "Composition Reference" instead of raw footage
- Double-clicking a composition reference opens it in a sub-editor (same UI, different timeline)
- The sub-composition has its own beat strip and tracks
- The output of the sub-composition renders into the parent as a single video clip

This pattern is borrowed from After Effects. It scales the system without bloating the primary UI.

### 28.8 Timeline Toolbar

A 32px tall toolbar sits above the beat strip in Pro Mode (in Simple Mode this toolbar is hidden).

Toolbar contents (left to right):
- Add track button (+ icon) - opens a menu to add V3, A3 etc, up to the 4-track max
- Snap toggle - on/off, indicates whether clips snap to beat boundaries
- Magnet icon (subtle, no full Final Cut magnetic timeline behavior) - just signals snap state
- Zoom controls - pinch-style horizontal zoom of the timeline content
- Spacer (flex)
- Right side: timecode display (current playhead position in `type.mono-sm`)

### 28.9 Performance and Render

The timeline updates at 60fps during playback and during drag operations. To maintain this:

- Each clip is its own React component, memoized so non-affected clips do not re-render on state change
- Waveforms render to canvas (via wavesurfer.js), not SVG, for cheap repaints
- Drag operations use `requestAnimationFrame` for smooth motion
- Timeline scroll uses CSS transform on the inner content container, not scroll-position updates that trigger layout

---

## 29. Remotion Interactive Overlay Architecture

This section solves the core technical question: the video preview in the editor is a Remotion `<Player>`, but we need users to click on objects, drag them, resize them, and modify them with chat. Remotion does not provide editing - it provides rendering. The editing layer is custom and sits on top.

This is the "Figma-on-top-of-Remotion" pattern. It is non-trivial. Documented here so an implementer does not have to figure it out from scratch.

### 29.1 The Architecture in Plain Language

The Remotion Player renders the video to a `<div>` containing HTML elements (text, img, custom React components). Each visual element has a `data-scene24-id` attribute (mandated by the agent's TSX rules - Section 7.2 of the architecture document).

On top of the Player, we render an absolutely-positioned overlay `<div>` at full Player width and height. The overlay handles all click, hover, drag, and resize interactions. When the user interacts with the overlay, we translate those interactions into TSX modifications and push them back into the Player's `inputProps`, which triggers a Remotion re-render.

The user perceives this as "I am editing the video". Technically, they are editing the source TSX, and the video re-renders from the new TSX in real-time.

### 29.2 Component Layering

```
+------------------------------------------------------------+
|  <Player>                                                  |
|  +---------------------------------------------------+     |
|  |  Remotion-rendered HTML                          |     |
|  |  (text, img, mockups with data-scene24-id)      |     |
|  +---------------------------------------------------+     |
+------------------------------------------------------------+

Above (z-index higher):

+------------------------------------------------------------+
|  <CanvasInteractionLayer>  (absolute positioned overlay)   |
|  +---------------------------------------------------+     |
|  |  - Mouse event capture                           |     |
|  |  - Selection rectangles                          |     |
|  |  - Drag handles                                  |     |
|  |  - Snap lines                                    |     |
|  |  - Hover highlights                              |     |
|  +---------------------------------------------------+     |
+------------------------------------------------------------+
```

The interaction layer is rendered as a sibling of the Player at the same DOM level, both wrapped in a positioned container.

### 29.3 Element Detection - getBoundingClientRect Sweep

When the user hovers or clicks on the canvas, the interaction layer needs to know which Remotion element is under the cursor. We solve this by sweeping all elements with `data-scene24-id`:

```tsx
const detectElementAtPoint = (x: number, y: number): string | null => {
  const playerEl = playerRef.current?.getContainerNode();
  if (!playerEl) return null;

  const elements = playerEl.querySelectorAll<HTMLElement>("[data-scene24-id]");
  // Sweep in reverse DOM order so topmost elements are matched first
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    const rect = el.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return el.getAttribute("data-scene24-id");
    }
  }
  return null;
};
```

On mouse move, the interaction layer calls `detectElementAtPoint(e.clientX, e.clientY)` and updates the hover highlight. On click, it selects the element. This works because the interaction layer captures `pointer-events`; the Remotion Player has `pointer-events: none` set on its visual elements so they don't intercept.

### 29.4 The pointer-events Trick

This is the critical detail that makes the architecture work:

```css
.player-container {
  position: relative;
}

.player-container .remotion-player {
  pointer-events: none; /* Player visual elements do not capture events */
}

.player-container .interaction-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: auto; /* Interaction layer captures everything */
}
```

The Player renders its visual content but does not capture mouse events. The interaction layer sits above, captures the events, and does the work of figuring out which visual element was targeted.

### 29.5 Drag-to-Reposition

When the user drags a selected element:

1. `onMouseDown` records the start position (`startX`, `startY`) and the element's current `data-scene24-id`
2. `onMouseMove` calculates delta and shows a visual ghost of the element at the new position (rendered in the interaction layer, not the Player)
3. `onMouseUp` commits the change by modifying the TSX `style` for that element

The TSX modification happens via a state update:

```tsx
const handleDragCommit = (elementId: string, delta: { x: number; y: number }) => {
  setEditState((prev) => {
    const next = { ...prev };
    next.elements[elementId] = {
      ...next.elements[elementId],
      x: next.elements[elementId].x + delta.x,
      y: next.elements[elementId].y + delta.y,
    };
    return next;
  });
};
```

The `editState` is passed to the Player as `inputProps`:

```tsx
<Player
  component={Ad}
  inputProps={{ editState }}
  durationInFrames={editState.duration * 30}
  compositionWidth={1920}
  compositionHeight={1080}
  fps={30}
/>
```

Inside the Ad composition, each element reads from `editState`:

```tsx
const Ad = ({ editState }: { editState: EditState }) => (
  <AbsoluteFill>
    <div
      data-scene24-id="hook-headline"
      style={{
        left: editState.elements["hook-headline"].x,
        top: editState.elements["hook-headline"].y,
        fontSize: editState.elements["hook-headline"].fontSize,
        color: editState.elements["hook-headline"].color,
        // ...
      }}
    >
      {editState.elements["hook-headline"].text}
    </div>
  </AbsoluteFill>
);
```

When `editState` updates, Remotion re-renders the affected frame. The user sees their drag-released element snap into the new position instantly.

### 29.6 Resize Handles

The interaction layer renders 8 resize handles around the selected element's bounding box - 4 corner handles (NW, NE, SE, SW) and 4 edge handles (N, E, S, W). The handles are 8x8 copper squares.

Dragging a handle resizes the element. The same `editState` mechanism applies - the handle drag commits a new `width` and `height` to the element's state.

### 29.7 Inspector Two-Way Binding

The inspector panel reads from the same `editState`. When the user changes a value in the inspector (e.g. changes font size from 48 to 64), the inspector updates `editState.elements[id].fontSize`, which:

1. Causes the Player to re-render with the new font size
2. Causes the interaction layer's selection rectangle to resize accordingly (because the element's bounding box just changed)
3. Causes the inspector itself to show the new value

This is two-way data binding via shared state. There is no "the inspector says X but the canvas shows Y" desync.

### 29.8 Chat-Driven Edits

When the user submits a chat message, the agent identifies the affected element by description ("the headline at the top") and modifies the TSX via the `edit_tsx` tool. The TSX modification:

1. Updates the source TSX file on disk (the canonical source)
2. Updates the in-memory parsed `editState` to match
3. The Player re-renders with the new state
4. The inspector updates if the affected element was selected
5. A brief copper pulse animation runs on the modified element (200ms scale 1.04 then back) so the user can see what just changed

### 29.9 TSX as Source of Truth

The architecture decision (already in the architecture document, restated here): the TSX file is the source of truth, not a separate `editState` JSON. The `editState` is a parsed representation of the TSX, kept in sync.

When the user closes the project and reopens it, we re-parse the TSX from disk and rebuild the `editState`. There is no "save state" - the TSX is the save state.

This means the agent and the user are editing the same artifact. The agent writes TSX; the user manipulates the parsed representation; modifications flow back to TSX. No translation layer between user-edits and agent-edits.

### 29.10 Real-Time Frame Updates

Remotion's `<Player>` accepts `inputProps` as a prop. When `inputProps` changes, the Player re-renders the current frame. This re-render is fast (~16ms on the user's machine for a typical ad composition) so user edits appear "instant".

For more complex ads with heavy compositions, we can use Remotion's `<Studio>` server-render fallback for previewing complex frames. This is an optimization we add later if needed - at MVP, in-browser rendering is sufficient.

### 29.11 Export-Time Render

When the user clicks "Export MP4", the system serializes the current TSX (which already encodes all user edits) and sends it to the server-side render pipeline (Remotion Lambda or self-hosted Remotion render). The render produces the final MP4 from the same TSX the user has been editing.

The user's preview and the final output are guaranteed pixel-identical (modulo browser-vs-headless-Chrome rendering differences, which Remotion already handles).

### 29.12 Mouse Event Reference

For implementers, the interaction layer's mouse event responsibilities:

```tsx
<div
  className="interaction-layer"
  onMouseMove={(e) => handleHover(e.clientX, e.clientY)}
  onMouseDown={(e) => handleSelectionStart(e.clientX, e.clientY)}
  onMouseUp={(e) => handleSelectionEnd(e.clientX, e.clientY)}
  onContextMenu={(e) => handleRightClick(e.clientX, e.clientY)}
  onDoubleClick={(e) => handleDoubleClick(e.clientX, e.clientY)}
  style={{ position: "absolute", inset: 0, zIndex: 10, cursor: getCursor() }}
>
  {/* Selection rectangle, handles, snap lines render here */}
</div>
```

The cursor changes based on hover state - default arrow when hovering empty space, pointer when hovering an element, move/resize cursors when hovering handles.

---

## 30. Direct Manipulation UX - Expanded

Section 17 introduced the editor. This section drills into direct manipulation - the specific interactions a user performs on selected canvas objects. Every interaction here is implemented via the architecture in Section 29.

### 30.1 Selecting an Element

- **Single click**: select one element. Previous selection is cleared.
- **Cmd/Ctrl-click**: add to selection (multi-select).
- **Shift-click on already-selected**: remove from selection.
- **Click empty canvas**: clear selection.
- **Cmd/Ctrl-A**: select all elements in the current beat.
- **Esc**: clear selection.

Selected elements show the copper selection rectangle (Section 13.11 `canvas.object-selection`) and the 8 resize handles. Multi-selection shows one combined bounding box around all selected elements.

### 30.2 Repositioning

- **Drag the element body**: moves the element. Snaps to canvas center axes and to other selected elements' edges. Hold Alt to disable snap.
- **Arrow keys**: nudge selected element 1px. Hold Shift for 10px nudge.
- **Cmd/Ctrl + arrow keys**: nudge to nearest snap point.

Snap visualization: when a snap engages, a 1px copper line appears at the snap axis (Section 13.11 `canvas.snap-line`). The line fades out on snap release.

### 30.3 Resizing

- **Drag a corner handle (NW/NE/SE/SW)**: resize from that corner, maintaining the opposite corner as anchor.
- **Drag a corner handle + Shift**: maintain aspect ratio during resize.
- **Drag an edge handle (N/E/S/W)**: resize that edge only.
- **Drag any handle + Alt**: resize from the element's center (scale outward).
- **Drag any handle + Cmd/Ctrl**: snap resize to canvas grid increments (every 8px).

Live resize feedback: a small badge appears next to the cursor showing the new dimensions in `type.mono-xs` (e.g. "320 × 180"). Badge dismisses on mouse-up.

### 30.4 Changing Text Content

- **Double-click a text element**: enter text-edit mode. The element becomes a `contentEditable` div.
- **In text-edit mode**: type to modify, Esc or Enter to commit, click outside to commit.
- **Selected (not in edit mode)**: the inspector's text field also allows modification.

### 30.5 Changing Font Properties

The inspector (Section 13.14) exposes font controls:

- Font family: dropdown of system fonts plus user's uploaded custom fonts plus our default trio (Geist, Fraunces, Syne)
- Font weight: numeric input (100-900) plus a 5-step pill toggle for common weights (300/400/500/600/700)
- Font size: numeric scrub input (`inspector.numeric-scrub`)
- Line height: numeric scrub input
- Letter spacing: numeric scrub input (range -0.1em to 0.1em, default 0)
- Text alignment: 3-state toggle (left/center/right)

All font changes commit immediately to `editState` and re-render the Player.

### 30.6 Changing Color

The inspector exposes color via a swatch + hex input pair:

- **Click swatch**: opens a color picker popover
- The popover has:
  - HSL or RGB color sliders
  - Hex input (validates on blur)
  - Recent colors row (last 8 colors used in this project)
  - Brand palette row (Scene24 tokens: copper, charcoal, ink, beige, etc.)
  - Eyedropper button (if the EyeDropper API is supported - Chrome/Edge)
- Color changes commit immediately
- The swatch button shows the active color in a 20x20 circle

### 30.7 Changing Opacity

- Inspector slider (0-100%) plus numeric input
- Live preview as the slider drags
- Reset button (clicking returns to 100%)

### 30.8 Changing Rotation

- Inspector numeric scrub input (range -180 to 180 degrees)
- Cursor changes to a rotation cursor when hovering near a corner handle from outside the element (slightly extending the corner handle's behavior)
- Snap to common angles when rotating: 0, 15, 30, 45, 60, 90, 120, 135, 150, 180 degrees. Snap visualised as a small angle indicator at the element's rotation pivot.

### 30.9 Changing Animation

The inspector's animation group (Section 13.14 `inspector.group`) exposes:

- Enter animation: dropdown (fade, slide-in-from-left/right/top/bottom, scale-in, custom)
- Enter duration: numeric scrub (in seconds, default 0.4)
- Enter delay: numeric scrub
- Enter easing: bezier curve editor (`inspector.animation-curve`)
- Exit animation: same controls
- Loop animation: toggle plus loop count

The animation curve editor lets the user drag the two control points of a cubic bezier visually. Plus a row of preset easings (linear, ease, ease-in, ease-out, ease-in-out, plus our `ease-standard`, `ease-emphasised`, etc.).

### 30.10 Changing Beat Properties

When a beat is selected (clicked in the beat strip), the inspector shows beat-level properties:

- Beat name: text input
- Beat duration: numeric scrub (in seconds)
- Beat transition (how it enters): dropdown (cut, fade, whip-pan, flash, slide, custom)
- Beat transition duration: numeric scrub
- Background color: color picker (for beats with no video background)

### 30.11 Keyboard Shortcuts for Direct Manipulation

Already partially in Section 12.2. Extended here:

- **V**: select tool (default)
- **T**: text tool (click to create new text element at click point)
- **R**: rectangle tool (drag to create new shape)
- **I**: image upload (opens file picker)
- **C**: crop tool (when image element selected)
- **Delete / Backspace**: delete selected elements
- **Cmd/Ctrl-D**: duplicate selected
- **Cmd/Ctrl-G**: group selected (groups become a single moveable unit)
- **Cmd/Ctrl-Shift-G**: ungroup
- **Cmd/Ctrl-]**: bring forward (z-index up)
- **Cmd/Ctrl-[**: send backward (z-index down)
- **Cmd/Ctrl-Shift-]**: bring to front
- **Cmd/Ctrl-Shift-[**: send to back

### 30.12 Multi-Select Operations

When multiple elements are selected, the inspector shows shared properties (e.g. if all selected elements have a fontSize, the fontSize input shows that value and modifying it changes all selected). Properties unique to individual elements show "Mixed" and clicking "Mixed" opens an inline picker to set a unified value or keep individual values.

Multi-element operations:
- Drag any selected element: all selected elements move together
- Resize via the combined bounding box handles: all selected scale proportionally
- Rotate: all selected rotate around the combined bounding box center
- Align/distribute: a small toolbar appears when 2+ elements selected, offering Align Left/Center/Right/Top/Middle/Bottom and Distribute Horizontally/Vertically

---

## 31. Theme System - Dark/Light with Visibility Guarantees

The product surfaces fall into two categories:

**Category A: Surfaces with forced mode**
- Editor: always Studio Dark (the canvas is video, dark is the only working surface)
- Generation stream: always Studio Dark

**Category B: Surfaces with user-controlled mode**
- Landing, Marketing pages
- Dashboard, Projects list
- Account, Settings, Billing
- Docs

For Category B, the user can switch between Paper Light and Studio Dark via the Appearance setting (Section 14.9). The default is Auto (follows OS preference).

### 31.1 The Theme Switch Mechanism

The theme is controlled by a `data-theme` attribute on the `<html>` element. The CSS variable system (Section 22.2) uses this attribute to select the appropriate token set.

```html
<html data-theme="paper"> <!-- or "studio" -->
```

The theme is set:
1. On initial page load, read from `localStorage.theme` or fall back to `matchMedia("(prefers-color-scheme: dark)")`
2. When the user toggles in settings, update `localStorage.theme` and re-set the attribute
3. On Category A pages (editor), force `data-theme="studio"` regardless of user preference

### 31.2 Transition Between Themes

When the theme changes, every element's color must transition smoothly. Without this, the screen would "flash" between themes.

```css
:root {
  transition: background-color 200ms ease-standard;
}

/* Apply transition to common color properties on all elements */
*, *::before, *::after {
  transition:
    background-color 200ms var(--ease-standard),
    color 200ms var(--ease-standard),
    border-color 200ms var(--ease-standard),
    fill 200ms var(--ease-standard),
    stroke 200ms var(--ease-standard);
}

/* Disable transitions while the user is actively dragging or scrolling */
.no-theme-transition * {
  transition: none !important;
}
```

The 200ms transition makes the theme change feel deliberate rather than jarring. The user perceives "the page is changing themes" rather than "the page broke".

### 31.3 Visibility Guarantees in Both Modes

Every Scene24 surface must remain functionally usable in both modes. This requires:

**Color contrast verification:**
Every text/background pair in both modes meets WCAG AA (4.5:1 for body, 3:1 for large text). We maintain a verified table:

| Pair | Paper | Studio |
|---|---|---|
| ink on canvas | 14.6:1 | 13.4:1 |
| ink-muted on canvas | 8.1:1 | 6.2:1 |
| ink-faint on canvas | 4.8:1 | 3.8:1 (large text only) |
| copper on canvas | 4.6:1 | 4.1:1 |
| white on copper-button | 4.1:1 | 4.1:1 |
| copper-on-dark on canvas | (n/a) | 5.2:1 |
| semantic-success on canvas | 5.3:1 | 4.7:1 |
| semantic-error on canvas | 5.1:1 | 4.5:1 |
| semantic-warn on canvas | 4.9:1 | 4.3:1 |

This table is regenerated whenever color tokens change.

**Component testing in both modes:**
Every component in Storybook ships with both Paper and Studio variants in the visual regression suite. Any component that becomes unreadable in one mode fails the regression and blocks merge.

### 31.4 Mode-Specific Adjustments

Some elements need slight adjustments between modes beyond simple color swap:

**Shadows:**
- Paper Mode: shadows use warm ink as base (`rgba(28, 23, 16, 0.08)`)
- Studio Mode: shadows use warm dark as base (`rgba(8, 9, 11, 0.4)`) - higher alpha because the warm dark on warm dark needs more contrast

**Borders:**
- Paper Mode: hairlines at 8% alpha of ink
- Studio Mode: hairlines at 6% alpha of ink (lower because dark surfaces need less border contrast)

**Liquid Glass tint:**
- Paper Mode: 4% copper tint
- Studio Mode: 6% copper tint (higher because dark backgrounds need more accent intensity)

**Noise texture opacity:**
- Paper Mode: grain at 40% opacity, multiply blend
- Studio Mode: grain at 30% opacity, screen blend

These adjustments are encoded in the CSS variables and applied automatically.

### 31.5 Edge Cases - User Content

User-uploaded media (images, video clips) and user-input text don't have automatic mode adjustments. We provide defaults:

- User text: defaults to `ink` (which is mode-aware)
- User images: rendered as-is, no mode modification
- Auto-detected brand colors from URL capture: stored absolute (not mode-relative), can clash with the active mode if the user changes themes

For the "user brand color clashes with current mode" case, we surface a subtle warning in the inspector ("This color has low contrast on the current background") with a "Auto-adjust" button that finds the nearest WCAG-passing variant.

### 31.6 Anti-Flash on Load

The most common theme-system bug is the brief flash of unstyled content (FOUC) when the page loads with the wrong theme and then switches. We prevent this with a blocking script in `<head>`:

```html
<script>
  (function () {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored || (prefersDark ? "studio" : "paper");
    document.documentElement.setAttribute("data-theme", theme);
  })();
</script>
```

This script runs before any CSS loads, sets the theme attribute, and prevents the flash. The rest of the page hydrates with the correct theme already applied.

### 31.7 Mode Toggle UI

In Settings > Appearance, the mode toggle is a 3-state segmented control:

- **Auto** (follows system) - default
- **Paper Light** - forces Paper on all Category B surfaces
- **Studio Dark** - forces Studio on all Category B surfaces

Above the segmented control, a small live preview shows what the current setting will produce - a tiny mockup of the dashboard at 30% scale in the chosen mode.

Plus a smaller toggle in the user's avatar dropdown (top-right of the app nav) for quick switching without leaving the current page. The dropdown toggle is a 2-state switch (Light / Dark) that overrides Auto if used.

---

## Appendix A: Anti-Pattern Examples (do not implement)

These are example patterns from competitor AI products that Scene24 must not adopt. We document them so it is unambiguous what we are avoiding.

**Anti-pattern 1: The cyan-to-magenta translucent gradient card.**
Common on AI startup landing pages. A frosted-glass card with a gradient background that fades from cyan to magenta. Reads as "Generic AI 2024-2026". We use solid surfaces with single warm accent.

**Anti-pattern 2: The "Live" pulsing dot.**
Common in chatbot UIs. A small coloured dot with a pulsing animation next to a "Live" label. Reads as "this is a chatbot demo". We use typographic status labels and surface lift.

**Anti-pattern 3: The four-pointed star AI icon.**
The icon used by Vercel AI, by Cursor, by countless others. It has become category shorthand for "this is the AI feature". We use no AI-specific iconography.

**Anti-pattern 4: The full-screen "thinking" loader.**
Replacing the working surface with a centred spinner labelled "AI is thinking...". We never do this. The work itself is the loader.

**Anti-pattern 5: The shouting confirmation dialog.**
"⚠️ ARE YOU SURE you want to delete this?" with a red icon and a red button. We use calm warm-toned destructive variants with clear typography.

**Anti-pattern 6: The "Welcome" video tutorial autoplay.**
A modal that opens on first sign-in and plays a 90-second welcome video. We use a single-screen onboarding that asks two questions and gets out of the way.

**Anti-pattern 7: The marketing footer with 18 link columns.**
Common on enterprise SaaS. We have 4 link columns plus the wordmark - the link count tells the user what to focus on, not what we want to fill space with.

---

## Appendix C: External Asset Download Guide

This appendix is the operational checklist for everything the team needs to acquire, install, or generate outside of code. It is written so that someone setting up Scene24 from a fresh clone can follow it step-by-step.

### C.1 Fonts (package installation)

All fonts ship as npm packages. Single install command:

```bash
pnpm add geist @fontsource-variable/fraunces @fontsource-variable/syne pretendard
```

Or with npm/yarn equivalent. After install, import in the root layout:

```tsx
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/syne";
import "pretendard/dist/web/static/pretendard.css";
```

If npm packages fail or for self-hosting, manual download sources:

| Font | Manual Source | License |
|---|---|---|
| Geist Sans / Mono | https://vercel.com/font (Vercel) | SIL OFL |
| Fraunces Variable | https://fonts.google.com/specimen/Fraunces | SIL OFL |
| Syne Variable | https://fonts.google.com/specimen/Syne | SIL OFL |
| Pretendard | https://github.com/orioncactus/pretendard/releases | SIL OFL |

Self-hosting: place WOFF2 files in `public/fonts/` and declare via `@font-face` (Section 6.3 has the unicode-range setup).

### C.2 Noise Texture PNG Assets (manual generation - critical)

These six PNG files must be generated by the team and placed in `public/textures/`. They cannot be auto-generated by code without sacrificing quality.

**Generation workflow (Figma - recommended):**

1. Create a free Figma account (figma.com)
2. Create a new design file
3. Install two community plugins:
   - **Noise & Texture** by rog.ie - search "Noise & Texture" in Figma plugins
   - **Noisy Gradients** by Metavatar - search "Noisy Gradients"
4. Generate each asset per the specification table below
5. Export each as PNG (1x and 2x for retina)
6. Run each PNG through TinyPNG (https://tinypng.com/) for compression
7. Save to `public/textures/` with the exact filenames below

**Asset specifications:**

| # | Filename | Dimensions | Base Color | Pattern | Plugin / Settings |
|---|---|---|---|---|---|
| 1 | `grain-paper.png` | 512×512 | `#f4ede0` | Tiled film grain | Noise & Texture - Type: Film Grain, Density: 20%, Size: 1.5px, Seamless: ON |
| 2 | `grain-paper@2x.png` | 1024×1024 | Same | Same scaled 2x | Same export at 2x |
| 3 | `grain-studio.png` | 512×512 | `#0c0d0f` | Tiled film grain | Noise & Texture - Type: Film Grain, Density: 15%, Size: 1.5px, Seamless: ON |
| 4 | `grain-studio@2x.png` | 1024×1024 | Same | Same | Same 2x |
| 5 | `gradient-warm-bloom.png` | 1920×1080 | Radial: `#e0763a` (center) → transparent (edge) | Soft radial bloom with grain | Noisy Gradients - Type: Radial, Noise: 25%, Grain size: 1.5px |
| 6 | `gradient-warm-bloom@2x.png` | 3840×2160 | Same | Same 2x | Same |
| 7 | `gradient-cool-bloom.png` | 1920×1080 | Radial: `#2a2520` (center) → transparent | Same as #5 | Same |
| 8 | `gradient-cool-bloom@2x.png` | 3840×2160 | Same | 2x | Same |
| 9 | `gradient-pumpkin-charcoal.png` | 1920×1080 | Linear: `#e0763a` (top-left) → `#2a2520` (bottom-right) | Diagonal gradient with grain | Noisy Gradients - Type: Linear 135deg, Noise: 25% |
| 10 | `gradient-pumpkin-charcoal@2x.png` | 3840×2160 | Same | 2x | Same |
| 11 | `texture-paper-edge.png` | 1024×1024 | Radial: transparent (center) → `#1c1710` at 8% alpha (edge) | Soft vignette with light grain | Noise & Texture - Vignette mode, Grain density: 10% |
| 12 | `texture-paper-edge@2x.png` | 2048×2048 | Same | 2x | Same |

**File size targets after TinyPNG compression:**
- Grain tiles (512x512): under 30KB each
- Bloom gradients (1920x1080): under 80KB each
- @2x versions: under 200KB each

If any file exceeds target, reduce noise density or reduce gradient bloom radius and re-export.

**Alternative workflow - Haikei (browser, no Figma needed):**

1. Visit https://haikei.app/
2. Select "Mesh Gradient" or "Blob Scene" generator
3. Set colors to our brand palette
4. Toggle "Grain" option ON
5. Configure size, density per the table above
6. Export PNG
7. Compress via TinyPNG and save to `public/textures/`

**Alternative workflow - Cohesion (browser, gradient+grain compositions):**

1. Visit https://cohesion.io/
2. Use mesh gradient + grain composer
3. Same color/density specifications
4. Export and compress

### C.3 SVG Icons - Two Approaches

Scene24 ships ~28 custom SVG icons (Section 10.2). Two ways to produce them:

**Approach A: Claude Code generates from spec**

Claude Code can read Section 10.1 (stroke spec: 1.5px, round caps, 24x24 viewBox) and Section 10.2 (icon inventory) and produce all icons as React components. This is the fastest start. Quality: 7/10 - good enough for MVP, polish later.

**Approach B: Hand-drawn by designer**

A designer draws each icon in Figma or Illustrator following the stroke spec, exports SVG, and the team imports them. Quality: 10/10 - production-grade. Time: ~4 hours total.

For MVP, ship Approach A. For launch polish, replace with Approach B.

### C.4 Brand Mark (Scene24 Glyph)

The 6-pointed asterisk brand mark (Section 3.1) ships as a single SVG.

**MVP version (Claude Code generates):**

```tsx
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  {[0, 30, 60, 90, 120, 150].map((angle) => (
    <line
      key={angle}
      x1="12" y1="12"
      x2={12 + 9 * Math.cos((angle - 90) * Math.PI / 180)}
      y2={12 + 9 * Math.sin((angle - 90) * Math.PI / 180)}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  ))}
</svg>
```

One stroke (the topmost, angle 0) renders in `accent.copper` instead of currentColor.

**Production version (designer polish):**

A designer refines the proportions, adds subtle asymmetry for character, and exports as production SVG. Optional polish step.

### C.5 Auth Provider Brand Icons

Each auth provider requires their official brand icon (using anything else violates brand guidelines and can cause OAuth approval rejection).

**Google G logo:**
- Source: https://developers.google.com/identity/branding-guidelines
- Section: "Sign-in branding guidelines" → "Google "G" logo"
- Download: official SVG, do not modify colors
- Save to: `public/icons/auth/google.svg`

**Apple logo (Sign in with Apple):**
- Source: https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple/overview/buttons/
- Section: "Logo" → download Apple Design Resources Sketch/Figma file or SVG
- Apple provides full sign-in button assets - we use just the logo portion since we render our own button shell
- Save to: `public/icons/auth/apple.svg`

**GitHub Octocat / mark:**
- Source: https://github.com/logos
- Download: "GitHub Mark" SVG (the octocat silhouette, not the wordmark)
- Save to: `public/icons/auth/github.svg`

**Rendering rules:**
- All three icons retain their official brand colors
- Render at 20x20 inside the auth provider button (Section 13.16)
- This is the one exception to the "icons inherit currentColor" rule

### C.6 Liquid Glass + Squircle Libraries (npm)

```bash
pnpm add liquid-glass-react figma-squircle
```

Wrapper components (Section 8.4 for Squircle, Section 24.3 for Liquid Glass) consume these directly.

### C.7 Audio Waveform Library

```bash
pnpm add wavesurfer.js
```

Required for the Pro Mode timeline's audio track waveform rendering (Section 28.5).

### C.8 Optional - Sample Video Assets for Landing Page

The landing page (Section 14.1) shows a mini-player loop of a real Scene24 output. At launch, this should be a curated 4-second loop of an actual generated ad.

**Pre-launch placeholder:**
- Use a generic stock 4-second video clip (Pexels, Pixabay) showing motion graphics
- Render as 1920x1080 WebM/VP9 at quality 30 (target file size 1.5MB)
- Save to `public/landing/hero-loop.webm` plus MP4 fallback `hero-loop.mp4`

**Launch version:**
- Replace with a Scene24-produced ad rendered specifically for the marketing hero
- Same format and dimensions
- This becomes a brand-evolved asset over time as we curate the best outputs

### C.9 Favicon and App Icons

- Favicon: 32x32 PNG + SVG version, the brand mark on a transparent background (light variant) and on `#f4ede0` filled (dark variant)
- Apple touch icon: 180x180 PNG with brand mark centered on `#f4ede0` rounded square
- Android chrome icon: 192x192 and 512x512 PNG, same composition
- Generated via realfavicongenerator.net or hand-crafted in Figma

### C.10 Final Asset Checklist Before Launch

Before public launch, the team confirms each asset exists at the expected path with the expected quality:

- [ ] All four fonts installed via npm and rendering correctly (test EN + KR text in both modes)
- [ ] All twelve noise texture PNGs (1x + 2x for each of 6 assets) in `public/textures/`
- [ ] All ~28 SVG icons in `components/icons/` rendered consistently
- [ ] Brand mark SVG in `public/brand/mark.svg`
- [ ] Three auth provider icons in `public/icons/auth/`
- [ ] Liquid Glass and Squircle libraries installed
- [ ] WaveSurfer installed and rendering peaks correctly
- [ ] Landing hero video loop in `public/landing/`
- [ ] Favicons and app icons configured in `public/`
- [ ] OpenGraph share image (1200x630) at `public/og-image.png`

---

## Appendix B: Component Quick Reference

A condensed list of every named component for fast lookup during implementation:

- `button.primary`, `button.primary-large`, `button.secondary`, `button.ghost`, `button.icon`, `button.icon-pill`, `button.destructive`
- `input.text`, `input.text-large`, `input.textarea`, `input.chat`, `input.search`, `input.numeric-scrub`
- `card.project`, `card.feature`, `card.pricing`, `card.template`, `card.generation-stream-panel`, `card.code-window`
- `pill.status.pending`, `pill.status.running`, `pill.status.success`, `pill.status.error`, `badge.brand`, `chip.tag`
- `nav.top-marketing`, `nav.top-app`, `nav.top-editor`, `nav.sidebar-app`
- `modal.default`, `modal.alert`, `sheet.bottom`, `sheet.side-right`
- `toast.default`, `message.inline-info`
- `tabs.default`, `toggle.pill-group`, `toggle.switch`
- `list.row`, `list.row-with-meta`, `table.default`
- `chat.thread`, `chat.message-user`, `chat.message-agent`, `chat.message-context-chip`, `chat.tool-call-row`, `chat.input`
- `canvas.frame`, `canvas.object-selection`, `canvas.snap-line`, `canvas.timecode-overlay`
- `timeline.container`, `timeline.beat-card`, `timeline.ruler`, `timeline.playhead`
- `doc.panel`, `doc.streaming-header`, `doc.line`, `doc.toc`, `doc.maximised`
- `inspector.panel`, `inspector.group`, `inspector.row`, `inspector.numeric-scrub`, `inspector.colour-picker`, `inspector.selectfield`, `inspector.animation-curve`
- `stream.container`, `stream.row`, `stream.row-thinking`, `stream.row-image-output`, `stream.progress`, `stream.minimised-pip`
- `auth.card`, `auth.provider-button`, `auth.atmospheric-wash`
- `footer.marketing`, `footer.app`

---

## Document End

This document is the single source of truth for Scene24 visual and interaction design. When implementing, reference the tokens by name, never inline values. When a design question arises that this document does not answer, the resolution goes back into this document for the next implementer.

Owner: Seongmin Lee (hi.danleedev@gmail.com)
Last revision: 2026-05-14
Next revision trigger: pre-launch sign-off, post-launch quarterly review.
