# JobCrab

JobCrab is a unified job-hunting platform that combines three workflows into one
seamless pipeline: **discover jobs**, **tailor your resume with AI**, and **send
cold-outreach emails** -- then track every application from discovery to offer.

## Features

- **Job Discovery** -- AI-assisted natural-language search across **RemoteOK**,
  **Naukri**, and **Wellfound**, with live scraping progress, company logos,
  filters, bookmarks, and a "Previous Searches" history.
- **Resume Tailoring** -- Upload a base resume, tailor it to a specific job's
  full description with an LLM, get an ATS score, and download the result as PDF.
- **Outreach Engine** -- Generate cold emails, preview/edit them, and send via
  SMTP with a safety pipeline (dry-run, daily volume caps, duplicate detection).
- **Application Dashboard** -- A Kanban board with drag-and-drop status updates,
  per-application timelines, editable notes, stats cards, and analytics charts.

## Tech Stack

| Layer        | Technology |
|--------------|------------|
| Frontend     | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Auth         | NextAuth.js (credentials), bcrypt, JWT sessions |
| Database     | PostgreSQL (Neon) via Prisma ORM |
| Scraper      | Python FastAPI microservice (httpx + Playwright + Firecrawl) |
| AI           | Groq / DeepSeek (OpenAI-compatible chat completions) |
| Charts / DnD | Recharts, @hello-pangea/dnd |

## Architecture

```
Next.js (app)  ──HTTP──>  Python FastAPI (scraper)
      │                          │
      └────────► PostgreSQL ◄─────┘  (Neon cloud)
      │
      └──► Groq / DeepSeek (LLM)   └──► SMTP (Gmail)
```

The Next.js app owns auth, the database, resume tailoring, and outreach.
The Python service handles scraping (RemoteOK API, Naukri via headless Chrome,
Wellfound via Firecrawl) and writes results to the same database.

## Local Development

### Prerequisites
- Node.js 20+
- Python 3.11+
- Google Chrome (required for the Naukri scraper)
- A PostgreSQL database (Neon free tier works great)

### Setup

```bash
# 1. Install Node dependencies
npm install

# 2. Install Python dependencies
pip install -r python-service/requirements.txt
python -m playwright install chromium   # optional fallback if Chrome is absent

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL, NEXTAUTH_SECRET, ENCRYPTION_SECRET,
# GROQ_API_KEY / DEEPSEEK_API_KEY, FIRECRAWL_API_KEY
# Also copy DATABASE_URL + DEEPSEEK_API_KEY + FIRECRAWL_API_KEY into python-service/.env

# 4. Set up the database
npx prisma generate
npx prisma db push        # or: npx prisma migrate dev

# 5. Run everything (frontend + scraper together)
npm run dev:all
```

- App:     http://localhost:3000
- Scraper: http://127.0.0.1:8000  (health: `/health`)

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `DATABASE_URL` | both | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | app | Secret for signing JWT sessions |
| `NEXTAUTH_URL` | app | Base URL (e.g. `http://localhost:3000`) |
| `ENCRYPTION_SECRET` | app | AES-256 key for encrypting SMTP/API credentials |
| `GROQ_API_KEY` | app | LLM key for resume tailoring + email generation |
| `DEEPSEEK_API_KEY` | both | Optional LLM key for query parsing |
| `FIRECRAWL_API_KEY` | both | Required for the Wellfound scraper |
| `PYTHON_SERVICE_URL` | app | Scraper base URL (`http://127.0.0.1:8000` locally) |

## Testing

```bash
npm run test            # Vitest unit tests
npm run test:e2e        # Playwright E2E tests
cd python-service && python -m pytest tests -q   # Python tests
```

## Deployment

- **Frontend** -> Vercel (uses `vercel.json`). Set all app env vars in the
  Vercel dashboard. Build runs `prisma generate && next build`.
- **Scraper** -> Railway / Fly.io using `python-service/Dockerfile`
  (`railway.json` provided). Expose its public URL and set it as
  `PYTHON_SERVICE_URL` in Vercel.
- **Database** -> Neon / Supabase. Run `npx prisma migrate deploy` against the
  production `DATABASE_URL`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js dev server only |
| `npm run dev:all` | Start Next.js + Python scraper together |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |

## License

Private project.