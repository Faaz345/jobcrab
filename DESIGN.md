# JobCrab — Design System & Brief

> Single source of truth for JobCrab's visual identity and page design.
> Every value here is extracted from the codebase — `app/globals.css`,
> `app/page.tsx`, `prisma/schema.prisma`, and the feature components.
> Nothing is invented. If the repo does not contain it, the design does not show it.

---

## 1. Product

- **Name:** JobCrab (`package.json` → `job-crab`)
- **Tagline (hero):** *Your AI-Powered Job Application Command Center*
- **One-liner (README):** Discover jobs, tailor your resume with AI, and send
  cold-outreach emails — then track every application from discovery to offer.
- **Framing (landing):** *Three engines. One platform.* —
  *Everything you need to go from "job searching" to "offer accepted."*
- **Brand mark:** the `Zap` (lightning) icon from `lucide-react`, inside a
  `rounded-lg bg-primary` square, next to the wordmark **JobCrab**.

### What leads (and therefore dominates)
Both the README and the landing page lead with **Job Discovery**. It is feature
#1 in `app/page.tsx` `features[]`. It carries the most visual weight on every
marketing surface.

> **Smart Job Discovery** — Search across Naukri, RemoteOK, and Wellfound using
> natural language. Our AI parses your intent and scrapes multiple job boards
> simultaneously.

---

## 2. The Native Shape: a Pipeline

JobCrab's core data structure is a **pipeline**, not a catalog. The
`ApplicationStatus` enum in `prisma/schema.prisma` is the product's spine, and
the Kanban board (`components/dashboard/kanban-board.tsx`) renders it directly.

```
Discovered → Resume Tailored → Email Sent → Response → Interview → Offer
                                                         (+ rejected, withdrawn)
```

**Design rule:** organize pages around this funnel. The three "engines"
(Discover → Tailor → Outreach) feed sequential stages; the dashboard is where
they converge. Prefer a pipeline/funnel structure over a flat feature grid.

---

## 3. Color

Dark-first. Colors are authored in **OKLCH** as CSS variables in
`app/globals.css`. The app applies the `.dark` palette by default.

### Core tokens (`.dark`)
| Token | Value | Use |
|-------|-------|-----|
| `--background` | `oklch(0.141 0.005 285.823)` | Page background (near-black, faint violet) |
| `--foreground` | `oklch(0.985 0.002 247.858)` | Primary text |
| `--card` / `--popover` | `oklch(0.185 0.007 285.823)` | Surfaces |
| `--primary` | `oklch(0.985 0.002 247.858)` | Primary actions (light-on-dark) |
| `--primary-foreground` | `oklch(0.21 0.006 285.885)` | Text on primary |
| `--muted` / `--accent` / `--secondary` | `oklch(0.274 0.006 285.885)` | Subtle fills |
| `--muted-foreground` | `oklch(0.632 0.014 264.531)` | Secondary text |
| `--border` / `--input` | `oklch(0.274 0.006 285.885)` | Borders, inputs |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Errors, destructive actions |
| `--ring` | `oklch(0.871 0.006 264.531)` | Focus rings |

A light palette exists in `:root` for completeness, but the product ships dark.

### Signature gradient (use sparingly — one flourish)
The hero accent, on `app/page.tsx`:
```
bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400  (bg-clip-text)
```
Ambient hero glows: `bg-blue-500/8` and `bg-purple-500/8`, `blur-3xl` orbs.

### Source colors (a job's source is always the same color)
| Source | Token classes |
|--------|---------------|
| **RemoteOK** | `bg-emerald-500/15 text-emerald-400 border-emerald-500/30` |
| **Naukri** | `bg-blue-500/15 text-blue-400 border-blue-500/30` |
| **Wellfound** | `bg-purple-500/15 text-purple-400 border-purple-500/30` |

### Pipeline stage colors (Kanban)
| Stage | Color |
|-------|-------|
| Discovered | `text-blue-400` |
| Resume Tailored | `text-purple-400` |
| Email Sent | `text-amber-400` |
| Response | `text-emerald-400` |
| Interview | `text-cyan-400` |
| Offer | `text-green-400` |

### Feature accents (landing `features[]`)
| Engine | Gradient | Icon color |
|--------|----------|-----------|
| Job Discovery | `from-blue-500/20 to-cyan-500/20` | `text-blue-400` |
| Resume Tailoring | `from-purple-500/20 to-pink-500/20` | `text-purple-400` |
| Cold Outreach | `from-amber-500/20 to-orange-500/20` | `text-amber-400` |

**Rule:** color carries meaning. Use source/stage/engine colors only where they
identify that thing. Everything else stays neutral (background/card/muted).

---

## 4. Typography

- **Sans:** Geist Sans (`--font-geist-sans`)
- **Mono:** Geist Mono (`--font-geist-mono`)
- Body: `antialiased`, `font-feature-settings: "rlig" 1, "calt" 1`

### Scale (from `app/page.tsx`)
| Role | Classes |
|------|---------|
| Hero | `text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight` |
| Section heading | `text-3xl sm:text-4xl font-bold tracking-tight` |
| Card title | `text-xl font-semibold` |
| Lead / subhead | `text-lg sm:text-xl text-muted-foreground` |
| Body | `text-sm leading-relaxed text-muted-foreground` |
| Meta / labels | `text-sm text-muted-foreground` |

---

## 5. Radius, Spacing & Surfaces

- **Radius base:** `--radius: 0.625rem`, scaled to
  `--radius-sm` (−4px), `--radius-md` (−2px), `--radius-lg`, `--radius-xl` (+4px).
- **Page container:** `mx-auto max-w-6xl px-6` (marketing);
  dashboard content lives in the `(dashboard)` segment shell.
- **Card pattern:** `rounded-xl border border-border/50 bg-card`,
  hover `hover:border-border hover:shadow-lg hover:shadow-black/5`,
  transitions `transition-all duration-300`.
- **Sticky nav:** `sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg`.
- **Scrollbar:** custom 6px, transparent track, thumb `oklch(0.5 0.01 285 / 0.3)`.
- Global `scroll-behavior: smooth`.

---

## 6. Components & Libraries

- **UI kit:** shadcn/ui on Radix (`components/ui/*`) — button, card, dialog,
  dropdown-menu, select, tabs, table, badge, input, textarea, checkbox, avatar,
  separator, tooltip, skeleton, sonner.
- **Icons:** `lucide-react` (e.g. `Zap`, `Search`, `FileText`, `Mail`,
  `Sparkles`, `Shield`, `BarChart3`).
- **Charts:** `recharts` (pipeline funnel bar chart + source pie chart).
- **Drag & drop:** `@hello-pangea/dnd` (Kanban status updates).
- **Toasts:** `sonner` (`<Toaster richColors position="bottom-right" />`),
  used for every mutation's success/error feedback.
- **Forms:** `react-hook-form` + `zod` resolvers; all API inputs validated by
  schemas in `lib/validators/`.

---

## 7. Copy Bank (use verbatim — from `app/page.tsx`)

- **Badge:** Powered by Groq & DeepSeek AI
- **Hero:** Your AI-Powered **Job Application** Command Center
  *(the gradient span wraps "Job Application")*
- **Subhead:** Discover jobs from multiple boards, tailor your resume for each
  role, and send personalized cold emails — all from one unified platform.
- **Hero stats:** `3` Job Sources · `AI` Resume Scoring · `∞` Applications
- **Section:** Three engines. One platform.
- **Steps:** `01` Discover · `02` Tailor · `03` Outreach
- **Benefits:**
  - **AI-Powered** — Groq & DeepSeek LLMs tailor every resume and email to perfection.
  - **Safety First** — Dry-run mode, volume caps, and human review before every email send.
  - **Track Everything** — Kanban pipeline from discovery to offer. Never lose track of an application.
- **CTAs:** Start Free · Get Started — It's Free · Sign in to existing account
- **Closing:** Ready to supercharge your job search? / Join JobCrab today and let AI do the heavy lifting.
- **Footer:** JobCrab © {year}
- **Dashboard metrics (`stats-cards.tsx`):** Total Applications · This Week ·
  Emails Sent · Response Rate

---

## 8. Design Goals

1. **Lead with Discovery.** Establish its weight before anything else —
   natural-language search across the three named boards (Naukri, RemoteOK,
   Wellfound) is the product's front door.
2. **Express the pipeline.** Mirror `ApplicationStatus` — the page should feel
   like a funnel from discovery to offer, not a flat list of features.
3. **Honor the safety story.** Outreach's differentiator is dry-run, volume
   caps, and audit trails. Surface it; don't bury it.
4. **Dark, OKLCH-true, gradient-restrained.** One signature gradient
   (blue → purple → pink). Source, stage, and engine colors used consistently
   and only where they carry meaning. Everything else neutral.

---

## 9. Critical Files

| File | Authority |
|------|-----------|
| `app/globals.css` | Color tokens, radius, scrollbar, base layer |
| `app/page.tsx` | All marketing copy, hero gradient, feature/step content |
| `prisma/schema.prisma` | The pipeline shape (`ApplicationStatus`) and entities |
| `components/jobs/job-card.tsx` | Source brand colors |
| `components/dashboard/kanban-board.tsx` | Stage labels + stage colors |
| `components/dashboard/stats-cards.tsx` | The four headline metrics |
| `components/ui/*` | Component primitives (shadcn/ui) |
| `README.md` | Feature ordering and product framing |