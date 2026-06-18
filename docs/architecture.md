# Architecture Document: AI-Powered Job Application Platform

> **Reference**: [problemStatement.md](./problemStatement.md)
> **Version**: 1.0 — June 15, 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Layered Architecture](#4-layered-architecture)
5. [Data Model & Schema](#5-data-model--schema)
6. [Module Architecture](#6-module-architecture)
7. [API Design](#7-api-design)
8. [Async Job Processing](#8-async-job-processing)
9. [AI / LLM Integration Layer](#9-ai--llm-integration-layer)
10. [Authentication & Security](#10-authentication--security)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Project Directory Structure](#13-project-directory-structure)
14. [Technology Decisions](#14-technology-decisions)

---

## 1. System Overview

The platform unifies three existing standalone projects into a single full-stack application with a **three-stage pipeline**:

```
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │ DISCOVER │─────▶│  TAILOR  │─────▶│ OUTREACH │
  │          │      │          │      │          │
  │ Scrape   │      │ AI-      │      │ AI-      │
  │ jobs from│      │ optimized│      │ generated│
  │ multiple │      │ resume   │      │ cold     │
  │ boards   │      │ per JD   │      │ emails   │
  └──────────┘      └──────────┘      └──────────┘
        │                │                  │
        └────────────────┼──────────────────┘
                         ▼
                  ┌─────────────┐
                  │  DASHBOARD  │
                  │  Track all  │
                  │  applications│
                  └─────────────┘
```

**Key constraint**: The scraping engine (Playwright, Firecrawl) runs in Python, while the web UI and resume tailoring run in Next.js/TypeScript. The architecture must cleanly bridge these two runtimes.

---

## 2. Architecture Principles

| Principle | Rationale |
|-----------|-----------|
| **Monorepo, dual-runtime** | One repository with a Next.js frontend + API and a Python microservice for scraping. Keeps deployment simple while respecting language boundaries. |
| **API-first** | All modules communicate through well-defined REST APIs. The frontend never calls Python directly — it goes through Next.js API routes which proxy to the Python service when needed. |
| **Shared database** | A single PostgreSQL database is the source of truth. Both Next.js and the Python service read/write to it. |
| **Async-by-default for heavy work** | Scraping and email sending are long-running operations. They execute asynchronously with real-time progress pushed to the UI via Server-Sent Events (SSE). |
| **Safety-first outreach** | Dry-run mode is the default. Emails require explicit human confirmation. Volume caps are enforced server-side. |
| **Reuse over rewrite** | Maximize reuse of existing code from all three projects. Port logic, not rewrite from scratch. |

---

## 3. High-Level Architecture

```mermaid
graph TB
    subgraph Client["Browser (Client)"]
        UI["Next.js Frontend<br/>React + Tailwind CSS"]
    end

    subgraph NextServer["Next.js Server (Vercel/Node)"]
        API["API Routes<br/>/api/*"]
        SSR["Server Components<br/>SSR Pages"]
        AuthMW["Auth Middleware<br/>NextAuth.js"]
        LLM_TS["LLM Service<br/>(Groq/DeepSeek)"]
        PDF["PDF Generator<br/>@sparticuz/chromium"]
        SMTP_MOD["Email Sender<br/>Nodemailer"]
    end

    subgraph PythonService["Python Microservice (FastAPI)"]
        SCRAPE_API["Scraping API<br/>/scrape/*"]
        NAUKRI["Naukri Scraper<br/>Playwright"]
        REMOTEOK["RemoteOK Scraper<br/>HTTP/API"]
        WELLFOUND["Wellfound Scraper<br/>Firecrawl"]
        NLP["Query Parser<br/>DeepSeek NLP"]
    end

    subgraph DataLayer["Data Layer"]
        DB[("PostgreSQL<br/>via Prisma ORM")]
        BLOB["File Storage<br/>Resumes/PDFs<br/>(local or S3)"]
    end

    subgraph External["External Services"]
        GROQ["Groq API<br/>Llama 3.3 70B"]
        DEEPSEEK["DeepSeek API"]
        GMAIL["Gmail SMTP<br/>smtp.gmail.com:587"]
        FIRECRAWL["Firecrawl API"]
        JOB_BOARDS["Job Boards<br/>Naukri, RemoteOK"]
    end

    UI -->|HTTP/SSE| API
    UI -->|RSC| SSR
    API -->|Prisma| DB
    API -->|HTTP| SCRAPE_API
    API --> LLM_TS
    API --> PDF
    API --> SMTP_MOD
    SSR -->|Prisma| DB
    SCRAPE_API --> NAUKRI
    SCRAPE_API --> REMOTEOK
    SCRAPE_API --> WELLFOUND
    SCRAPE_API --> NLP
    SCRAPE_API -->|psycopg2/SQLAlchemy| DB
    NAUKRI --> JOB_BOARDS
    WELLFOUND --> FIRECRAWL
    NLP --> DEEPSEEK
    LLM_TS --> GROQ
    LLM_TS --> DEEPSEEK
    SMTP_MOD --> GMAIL
    PDF --> BLOB
```

---

## 4. Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│  Next.js App Router │ React Server Components │ Client  │
│  Components         │ Tailwind CSS │ shadcn/ui          │
├─────────────────────────────────────────────────────────┤
│                     API LAYER                           │
│  Next.js Route Handlers (/api/*)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ /api/jobs │ │/api/resume│ │/api/email │ │/api/apps  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
├─────────────────────────────────────────────────────────┤
│                   SERVICE LAYER                          │
│  ┌──────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ JobService    │ │ResumeService│ │ OutreachService  │  │
│  │ (orchestrates │ │(LLM tailor, │ │ (email gen,      │  │
│  │  scraping)    │ │ PDF export) │ │  SMTP send)      │  │
│  └──────────────┘ └────────────┘ └──────────────────┘  │
│  ┌──────────────┐ ┌────────────────────────────────┐    │
│  │ LLMService   │ │ ApplicationService             │    │
│  │ (Groq/DS)    │ │ (pipeline state, dashboard)    │    │
│  └──────────────┘ └────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│                   DATA ACCESS LAYER                      │
│  Prisma ORM (TypeScript) │ SQLAlchemy (Python)          │
│  Shared PostgreSQL schema                                │
├─────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE LAYER                    │
│  PostgreSQL │ File Storage │ Gmail SMTP │ External APIs  │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Data Model & Schema

### 5.1 Entity Relationship Diagram

```mermaid
erDiagram
    USER {
        uuid id PK
        string email UK
        string name
        string password_hash
        json smtp_credentials_encrypted
        json api_keys_encrypted
        datetime created_at
        datetime updated_at
    }

    BASE_RESUME {
        uuid id PK
        uuid user_id FK
        string name
        text raw_text
        string file_path
        boolean is_default
        datetime created_at
    }

    SCRAPE_SESSION {
        uuid id PK
        uuid user_id FK
        string query
        string sources
        string status "pending|running|completed|failed"
        int total_results
        datetime started_at
        datetime completed_at
    }

    JOB_LISTING {
        uuid id PK
        uuid scrape_session_id FK
        uuid user_id FK
        string title
        string company
        string location
        string salary_range
        text description
        string url UK
        string source "naukri|remoteok|wellfound"
        string[] tags
        boolean is_bookmarked
        datetime posted_at
        datetime scraped_at
    }

    APPLICATION {
        uuid id PK
        uuid user_id FK
        uuid job_listing_id FK
        string status "discovered|resume_tailored|email_drafted|email_sent|response_received|interview|offer|rejected|withdrawn"
        text notes
        datetime created_at
        datetime updated_at
    }

    TAILORED_RESUME {
        uuid id PK
        uuid application_id FK
        uuid base_resume_id FK
        uuid job_listing_id FK
        text tailored_text
        json changes_summary
        string pdf_path
        float ats_score
        string llm_model_used
        datetime created_at
    }

    OUTREACH_EMAIL {
        uuid id PK
        uuid application_id FK
        uuid job_listing_id FK
        uuid tailored_resume_id FK "nullable"
        string recipient_email
        string recipient_name
        string subject
        text body_html
        text body_plain
        string status "drafted|sent|skipped|failed"
        boolean is_dry_run
        string smtp_message_id
        text error_message
        datetime sent_at
        datetime created_at
    }

    AUDIT_LOG {
        uuid id PK
        uuid user_id FK
        string entity_type "job|resume|email|application"
        uuid entity_id
        string action "created|updated|sent|skipped|failed"
        json metadata
        datetime created_at
    }

    USER ||--o{ BASE_RESUME : uploads
    USER ||--o{ SCRAPE_SESSION : initiates
    USER ||--o{ JOB_LISTING : owns
    USER ||--o{ APPLICATION : tracks
    SCRAPE_SESSION ||--o{ JOB_LISTING : produces
    JOB_LISTING ||--o| APPLICATION : triggers
    APPLICATION ||--o{ TAILORED_RESUME : generates
    APPLICATION ||--o{ OUTREACH_EMAIL : sends
    BASE_RESUME ||--o{ TAILORED_RESUME : derives_from
    JOB_LISTING ||--o{ TAILORED_RESUME : targets
    TAILORED_RESUME ||--o{ OUTREACH_EMAIL : attaches
    USER ||--o{ AUDIT_LOG : produces
```

### 5.2 Key Schema Decisions

| Decision | Rationale |
|----------|-----------|
| **`APPLICATION` as the central entity** | Links a job listing to its tailored resume(s) and outreach email(s). This is the "pipeline record" that the dashboard tracks. |
| **`SCRAPE_SESSION` groups job listings** | Users run searches that produce batches of results. This lets us track scraping history and re-run queries. |
| **Encrypted credential storage** | `smtp_credentials_encrypted` and `api_keys_encrypted` are JSON blobs encrypted with AES-256 before persisting. Decryption happens only in the service layer at runtime. |
| **`AUDIT_LOG` for compliance** | Every significant action is logged immutably — critical for the safety-first email outreach system. |
| **`status` as an enum on `APPLICATION`** | Drives the Kanban board and analytics. Status transitions are validated in the service layer. |

---

## 6. Module Architecture

### 6.1 Module 1: Job Discovery Engine

```mermaid
sequenceDiagram
    participant User
    participant UI as Next.js Frontend
    participant API as /api/jobs
    participant PySvc as Python FastAPI
    participant DB as PostgreSQL

    User->>UI: Enter search query
    UI->>API: POST /api/jobs/search {query, sources, limit}
    API->>DB: Create SCRAPE_SESSION (status: pending)
    API->>PySvc: POST /scrape/start {session_id, query, sources}
    PySvc-->>API: 202 Accepted {task_id}
    API-->>UI: 202 {session_id, task_id}

    loop SSE Progress Stream
        UI->>API: GET /api/jobs/search/{session_id}/stream
        PySvc->>DB: INSERT JOB_LISTING rows as scraped
        API->>DB: Poll new JOB_LISTINGs
        API-->>UI: SSE event: {new_jobs: [...], progress: 45%}
    end

    PySvc->>DB: Update SCRAPE_SESSION (status: completed)
    API-->>UI: SSE event: {status: completed, total: 47}
    User->>UI: Browse/filter/bookmark results
```

**Python Scraper Internal Architecture:**

```
python-service/
├── app/
│   ├── main.py                  # FastAPI app entry
│   ├── api/
│   │   └── scrape_routes.py     # POST /scrape/start, GET /scrape/status
│   ├── scrapers/
│   │   ├── base.py              # Abstract BaseScraper class
│   │   ├── naukri.py            # Playwright-based Naukri scraper
│   │   ├── remoteok.py          # HTTP API-based RemoteOK scraper
│   │   └── wellfound.py         # Firecrawl-based Wellfound scraper
│   ├── parsers/
│   │   └── query_parser.py      # DeepSeek NLP query → structured params
│   ├── normalizers/
│   │   └── job_normalizer.py    # Normalize all sources → unified schema
│   ├── db/
│   │   └── repository.py        # SQLAlchemy models + DB writes
│   └── config.py                # Environment / settings
├── requirements.txt
└── Dockerfile
```

### 6.2 Module 2: Resume Tailoring Engine

```mermaid
sequenceDiagram
    participant User
    participant UI as Next.js Frontend
    participant API as /api/resume
    participant LLM as LLM Service
    participant PDF as PDF Generator
    participant DB as PostgreSQL
    participant FS as File Storage

    User->>UI: Select job listing → "Tailor Resume"
    UI->>API: POST /api/resume/tailor {job_id, base_resume_id}
    API->>DB: Fetch JOB_LISTING.description
    API->>DB: Fetch BASE_RESUME.raw_text
    API->>LLM: Prompt: Tailor resume for JD
    LLM-->>API: Tailored resume text + changes summary
    API->>DB: Create APPLICATION (status: resume_tailored)
    API->>DB: Create TAILORED_RESUME
    API-->>UI: {tailored_text, changes, ats_score}

    User->>UI: Review/edit → "Download PDF"
    UI->>API: POST /api/resume/pdf {tailored_resume_id}
    API->>PDF: Render HTML → PDF
    PDF->>FS: Save PDF file
    API->>DB: Update TAILORED_RESUME.pdf_path
    API-->>UI: {pdf_url}
```

**LLM Prompt Architecture for Resume Tailoring:**

```
┌─────────────────────────────────────────────┐
│              SYSTEM PROMPT                   │
│  "You are an expert resume writer..."        │
├─────────────────────────────────────────────┤
│              USER PROMPT                     │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Base Resume Text │  │ Job Description  │  │
│  │ (from DB)        │  │ (from DB)        │  │
│  └─────────────────┘  └─────────────────┘  │
│                                              │
│  Instructions:                               │
│  1. Match keywords from JD                   │
│  2. Reword experience bullets                │
│  3. Prioritize relevant skills               │
│  4. Return JSON: {tailored, changes, score}  │
└─────────────────────────────────────────────┘
```

### 6.3 Module 3: Outreach Engine

```mermaid
sequenceDiagram
    participant User
    participant UI as Next.js Frontend
    participant API as /api/email
    participant LLM as LLM Service
    participant SMTP as Nodemailer
    participant DB as PostgreSQL

    User->>UI: Select application → "Draft Email"
    UI->>API: POST /api/email/generate {application_id, recipient}
    API->>DB: Fetch JOB_LISTING + TAILORED_RESUME
    API->>LLM: Generate personalized cold email
    LLM-->>API: {subject, body_html, body_plain}
    API->>DB: Create OUTREACH_EMAIL (status: drafted)
    API-->>UI: {draft email preview}

    User->>UI: Edit email → "Send" / "Skip"

    alt User clicks "Send"
        UI->>API: POST /api/email/send {email_id}
        API->>API: Check volume cap (MAX_PER_DAY)
        API->>API: Check dry_run setting
        alt Dry Run = true
            API->>DB: Update status → "drafted (dry-run)"
            API-->>UI: "Dry-run: email NOT sent"
        else Dry Run = false
            API->>SMTP: Send via Gmail SMTP
            SMTP-->>API: {message_id}
            API->>DB: Update status → "sent"
            API->>DB: Insert AUDIT_LOG
            API-->>UI: "Email sent successfully"
        end
    else User clicks "Skip"
        UI->>API: POST /api/email/skip {email_id}
        API->>DB: Update status → "skipped"
        API->>DB: Insert AUDIT_LOG
    end
```

**Safety Controls (enforced server-side):**

```
┌──────────────────────────────────────────┐
│          EMAIL SAFETY PIPELINE            │
│                                           │
│  1. ✅ Is user authenticated?             │
│  2. ✅ Is dry_run = false? (explicit opt-in)
│  3. ✅ Are SMTP credentials configured?   │
│  4. ✅ Has user confirmed this send?       │
│  5. ✅ Is daily volume cap not exceeded?   │
│  6. ✅ Was recipient not already emailed?  │
│  7. → Send via SMTP                       │
│  8. → Log to AUDIT_LOG                    │
└──────────────────────────────────────────┘
```

### 6.4 Module 4: Application Dashboard

```mermaid
graph LR
    subgraph KanbanBoard["Kanban Board View"]
        D["🔍 Discovered"]
        RT["📝 Resume Tailored"]
        ES["📧 Email Sent"]
        RR["💬 Response Received"]
        IV["🎤 Interview"]
        OF["🎉 Offer"]
    end

    D --> RT --> ES --> RR --> IV --> OF

    subgraph DataSources["Data Sources"]
        J["JOB_LISTING"]
        T["TAILORED_RESUME"]
        E["OUTREACH_EMAIL"]
        A["APPLICATION"]
    end

    J -->|status| D
    T -->|exists| RT
    E -->|status=sent| ES
    A -->|manual update| RR
    A -->|manual update| IV
    A -->|manual update| OF
```

**Dashboard API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/applications` | GET | List all applications with filtering/sorting |
| `/api/applications/:id` | GET | Single application with full timeline |
| `/api/applications/:id/status` | PATCH | Update application stage |
| `/api/applications/stats` | GET | Aggregate analytics (counts by status, source, etc.) |

---

## 7. API Design

### 7.1 API Route Map

```
/api
├── /auth
│   ├── POST   /register          # Create account
│   ├── POST   /login             # Login → JWT
│   ├── POST   /logout            # Invalidate session
│   └── GET    /me                # Current user profile
│
├── /jobs
│   ├── POST   /search            # Start scrape session
│   ├── GET    /search/:id/stream # SSE progress stream
│   ├── GET    /search/:id        # Get scrape session results
│   ├── GET    /                  # List all scraped jobs (paginated)
│   ├── GET    /:id               # Single job detail
│   ├── PATCH  /:id/bookmark      # Toggle bookmark
│   └── DELETE /:id               # Remove job listing
│
├── /resume
│   ├── POST   /upload            # Upload base resume
│   ├── GET    /base              # List base resumes
│   ├── DELETE /base/:id          # Delete base resume
│   ├── POST   /tailor            # AI-tailor resume for a job
│   ├── GET    /tailored/:id      # Get tailored resume
│   ├── PUT    /tailored/:id      # Edit tailored resume
│   ├── POST   /tailored/:id/pdf  # Generate PDF
│   └── GET    /tailored/:id/pdf  # Download PDF
│
├── /email
│   ├── POST   /generate          # AI-generate cold email
│   ├── GET    /:id               # Get email draft
│   ├── PUT    /:id               # Edit email draft
│   ├── POST   /:id/send          # Send (with safety checks)
│   ├── POST   /:id/skip          # Skip this email
│   └── GET    /audit-log         # View send history
│
├── /applications
│   ├── GET    /                  # List applications (Kanban data)
│   ├── GET    /:id               # Application detail + timeline
│   ├── PATCH  /:id/status        # Update stage
│   ├── PATCH  /:id/notes         # Update notes
│   └── GET    /stats             # Dashboard analytics
│
└── /settings
    ├── GET    /                  # Get user settings
    ├── PUT    /smtp              # Update SMTP credentials
    └── PUT    /api-keys          # Update LLM API keys
```

### 7.2 Request/Response Examples

**Start a job search:**

```json
// POST /api/jobs/search
// Request:
{
  "query": "Backend Developer in Mumbai, remote-friendly",
  "sources": ["naukri", "remoteok", "wellfound"],
  "limit": 50,
  "headless": true,
  "pages": 3
}

// Response: 202 Accepted
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "stream_url": "/api/jobs/search/550e8400.../stream"
}
```

**Tailor a resume:**

```json
// POST /api/resume/tailor
// Request:
{
  "job_listing_id": "job-uuid-123",
  "base_resume_id": "resume-uuid-456"
}

// Response: 200 OK
{
  "tailored_resume_id": "tailored-uuid-789",
  "application_id": "app-uuid-012",
  "tailored_text": "...",
  "changes_summary": {
    "keywords_added": ["React", "Node.js", "AWS"],
    "bullets_reworded": 4,
    "sections_reordered": true
  },
  "ats_score": 87.5,
  "model_used": "llama-3.3-70b-versatile"
}
```

**Send a cold email:**

```json
// POST /api/email/{id}/send
// Request: (empty body — confirmation is the intent)

// Response (dry-run):
{
  "status": "drafted",
  "dry_run": true,
  "message": "Dry-run mode: email was NOT sent. Disable dry-run in settings to send."
}

// Response (live):
{
  "status": "sent",
  "smtp_message_id": "<abc123@gmail.com>",
  "sent_at": "2026-06-15T10:30:00Z",
  "audit_log_id": "log-uuid-345"
}
```

---

## 8. Async Job Processing

Scraping and bulk email operations are long-running. We use a lightweight async pattern:

```mermaid
graph LR
    subgraph NextAPI["Next.js API"]
        A["POST /api/jobs/search"]
        B["SSE /api/jobs/search/:id/stream"]
    end

    subgraph PythonSvc["Python FastAPI"]
        C["POST /scrape/start"]
        D["Background Task<br/>(asyncio / threading)"]
    end

    subgraph DB["PostgreSQL"]
        E["scrape_sessions table"]
        F["job_listings table"]
    end

    A -->|HTTP POST| C
    C -->|Spawn| D
    D -->|Write rows| F
    D -->|Update status| E
    B -->|Poll DB every 2s| F
    B -->|SSE push| UI["Browser"]
```

**For MVP, we avoid a dedicated message queue.** Instead:

- The Python service uses `asyncio.create_task()` or `BackgroundTasks` (FastAPI built-in) to run scrapers in the background.
- The Next.js SSE endpoint polls the database every 2 seconds for new `JOB_LISTING` rows belonging to the active session.
- The `SCRAPE_SESSION.status` field acts as the coordination signal (`pending → running → completed | failed`).

**Future scaling**: Replace DB-polling with Redis pub/sub or a proper job queue (Celery, BullMQ).

---

## 9. AI / LLM Integration Layer

### 9.1 Unified LLM Service

A shared service abstraction that both resume tailoring and email generation use:

```typescript
// lib/services/llm-service.ts

interface LLMConfig {
  provider: "groq" | "deepseek";
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature?: number;
  maxTokens?: number;
}

interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: "json" | "text";
}

interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: { prompt: number; completion: number };
}

class LLMService {
  async complete(config: LLMConfig, request: LLMRequest): Promise<LLMResponse>;
  async streamComplete(config: LLMConfig, request: LLMRequest): AsyncGenerator<string>;
}
```

### 9.2 LLM Usage Matrix

| Use Case | Provider | Model | Called From | Temperature |
|----------|----------|-------|-------------|-------------|
| NL query parsing | DeepSeek | deepseek-v4-flash | Python service | 0.1 |
| Resume tailoring | Groq | llama-3.3-70b-versatile | Next.js API | 0.3 |
| Resume tailoring (fallback) | DeepSeek | deepseek-v4-flash | Next.js API | 0.3 |
| Cold email generation | Groq | llama-3.3-70b-versatile | Next.js API | 0.5 |
| ATS score estimation | Groq | llama-3.3-70b-versatile | Next.js API | 0.0 |

### 9.3 Prompt Templates

Stored in `lib/prompts/` as template files:

```
lib/prompts/
├── resume-tailor.system.md    # System prompt for resume tailoring
├── resume-tailor.user.md      # User prompt template ({{resume}}, {{jd}})
├── email-generate.system.md   # System prompt for cold email
├── email-generate.user.md     # User prompt template ({{job}}, {{resume_highlights}}, {{recipient}})
└── ats-score.system.md        # System prompt for ATS scoring
```

---

## 10. Authentication & Security

### 10.1 Auth Architecture

```mermaid
graph LR
    Browser -->|Cookie/JWT| NextAuth["NextAuth.js<br/>Credentials Provider"]
    NextAuth -->|Session| API["API Routes"]
    API -->|user_id| DB["PostgreSQL<br/>users table"]
    API -->|Decrypt| Vault["AES-256 Encryption<br/>for SMTP/API keys"]
```

| Feature | Implementation |
|---------|---------------|
| **Auth framework** | NextAuth.js v5 with Credentials provider |
| **Session strategy** | JWT (stateless, stored in httpOnly cookie) |
| **Password hashing** | bcrypt (12 rounds) |
| **SMTP credential storage** | AES-256-GCM encrypted, key from `ENCRYPTION_SECRET` env var |
| **API key storage** | Same AES-256 encryption as SMTP credentials |
| **Route protection** | Next.js middleware checks session on all `/api/*` and `/dashboard/*` routes |
| **CSRF protection** | Built-in NextAuth CSRF tokens |

### 10.2 Environment Variables

```env
# Application
DATABASE_URL=postgresql://user:pass@host:5432/jobcrab
NEXTAUTH_SECRET=<random-32-byte-hex>
NEXTAUTH_URL=http://localhost:3000
ENCRYPTION_SECRET=<random-32-byte-hex-for-AES>

# LLM APIs (server-side only)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-v4-flash

# Python Scraper Service
PYTHON_SERVICE_URL=http://localhost:8000
PYTHON_SERVICE_API_KEY=<internal-service-key>

# Firecrawl (for Wellfound scraping)
FIRECRAWL_API_KEY=fc-...

# Default outreach safety
DEFAULT_DRY_RUN=true
MAX_EMAILS_PER_DAY=10
```

---

## 11. Frontend Architecture

### 11.1 Page Structure (App Router)

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx                    # Sidebar + header layout
│   ├── page.tsx                      # Dashboard home (overview/stats)
│   ├── jobs/
│   │   ├── page.tsx                  # Job search + results list
│   │   └── [id]/page.tsx             # Single job detail
│   ├── resumes/
│   │   ├── page.tsx                  # Base resumes list
│   │   └── tailored/[id]/page.tsx    # Tailored resume preview/edit
│   ├── outreach/
│   │   ├── page.tsx                  # Email drafts + sent log
│   │   └── [id]/page.tsx             # Single email detail
│   ├── applications/
│   │   ├── page.tsx                  # Kanban board
│   │   └── [id]/page.tsx             # Application timeline
│   └── settings/
│       └── page.tsx                  # SMTP, API keys, preferences
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── jobs/
│   ├── resume/
│   ├── email/
│   ├── applications/
│   └── settings/
├── layout.tsx                        # Root layout
├── page.tsx                          # Landing page
└── globals.css
```

### 11.2 Component Architecture

```
components/
├── ui/                      # shadcn/ui base components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── badge.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   └── ...
├── layout/
│   ├── sidebar.tsx           # Navigation sidebar
│   ├── header.tsx            # Top bar with search + user menu
│   └── page-wrapper.tsx      # Consistent page padding/width
├── jobs/
│   ├── job-search-form.tsx   # NL search input + source toggles
│   ├── job-card.tsx          # Single job listing card
│   ├── job-list.tsx          # Filterable/sortable job grid
│   ├── job-detail.tsx        # Full job description view
│   └── scrape-progress.tsx   # Real-time scraping progress bar
├── resume/
│   ├── resume-upload.tsx     # Drag-drop resume upload
│   ├── resume-editor.tsx     # Side-by-side original vs tailored
│   ├── resume-preview.tsx    # PDF preview panel
│   ├── ats-score-badge.tsx   # ATS match score display
│   └── changes-diff.tsx      # Visual diff of tailoring changes
├── outreach/
│   ├── email-composer.tsx    # Rich email editor
│   ├── email-preview.tsx     # Preview as recipient sees it
│   ├── send-controls.tsx     # Send/Skip/DryRun toggle
│   └── audit-log-table.tsx   # Send history table
├── dashboard/
│   ├── kanban-board.tsx      # Drag-drop application pipeline
│   ├── kanban-column.tsx     # Single column (Discovered, etc.)
│   ├── kanban-card.tsx       # Single application card
│   ├── stats-cards.tsx       # Summary statistics
│   ├── timeline.tsx          # Per-application event timeline
│   └── analytics-charts.tsx  # Charts (by source, response rate)
└── shared/
    ├── loading-spinner.tsx
    ├── empty-state.tsx
    ├── error-boundary.tsx
    └── confirmation-dialog.tsx
```

### 11.3 State Management

| Concern | Solution |
|---------|----------|
| **Server state** (jobs, resumes, emails) | React Server Components + `fetch` with `revalidatePath` |
| **Mutations** | Server Actions (Next.js) or `fetch` to API routes |
| **Real-time updates** (scraping progress) | EventSource (SSE) → React state via `useEffect` |
| **Form state** | React Hook Form + Zod validation |
| **Client-only UI state** (modals, tabs) | `useState` / `useReducer` (no global store needed) |
| **Optimistic updates** (bookmark, status change) | `useOptimistic` (React 19) |

---

## 12. Deployment Architecture

### 12.1 Production Deployment

```mermaid
graph TB
    subgraph Vercel["Vercel (Frontend + API)"]
        Next["Next.js App<br/>SSR + API Routes"]
        Edge["Edge Middleware<br/>Auth checks"]
    end

    subgraph Railway["Railway / Fly.io"]
        Python["Python FastAPI<br/>+ Playwright"]
        Chrome["Headless Chrome<br/>(bundled)"]
    end

    subgraph Managed["Managed Services"]
        PG["PostgreSQL<br/>(Neon / Supabase)"]
        S3["File Storage<br/>(Vercel Blob / S3)"]
    end

    subgraph External["External"]
        Groq["Groq API"]
        DS["DeepSeek API"]
        FC["Firecrawl API"]
        Gmail["Gmail SMTP"]
    end

    Client["Browser"] --> Vercel
    Next -->|Internal API| Python
    Next -->|Prisma| PG
    Next -->|Upload/Download| S3
    Python -->|SQLAlchemy| PG
    Python --> Chrome
    Next --> Groq
    Next --> DS
    Python --> FC
    Next --> Gmail
```

### 12.2 Local Development

```bash
# Terminal 1: Next.js frontend + API
cd final-project
npm run dev                    # → http://localhost:3000

# Terminal 2: Python scraping service
cd final-project/python-service
uvicorn app.main:app --reload  # → http://localhost:8000

# Terminal 3: Database (if not using cloud)
docker compose up postgres     # → localhost:5432
```

### 12.3 Docker Compose (development)

```yaml
# docker-compose.yml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: jobcrab
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  python-service:
    build: ./python-service
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://dev:devpassword@postgres:5432/jobcrab
      FIRECRAWL_API_KEY: ${FIRECRAWL_API_KEY}
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
    depends_on:
      - postgres

volumes:
  pgdata:
```

---

## 13. Project Directory Structure

```
final-project/
├── docs/
│   ├── problemStatement.md
│   └── architecture.md            # ← This document
│
├── app/                           # Next.js App Router pages
│   ├── (auth)/                    # Login, register
│   ├── (dashboard)/               # Protected dashboard pages
│   ├── api/                       # API route handlers
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/                    # React components
│   ├── ui/                        # shadcn/ui primitives
│   ├── layout/                    # Shell, sidebar, header
│   ├── jobs/                      # Job discovery components
│   ├── resume/                    # Resume tailoring components
│   ├── outreach/                  # Email outreach components
│   ├── dashboard/                 # Dashboard/kanban components
│   └── shared/                    # Cross-cutting components
│
├── lib/                           # Shared utilities & services
│   ├── services/
│   │   ├── llm-service.ts         # Groq/DeepSeek abstraction
│   │   ├── resume-service.ts      # Resume tailoring logic
│   │   ├── email-service.ts       # Email generation + sending
│   │   ├── job-service.ts         # Job search orchestration
│   │   └── application-service.ts # Pipeline state management
│   ├── prompts/                   # LLM prompt templates
│   ├── db/
│   │   └── prisma.ts              # Prisma client singleton
│   ├── auth/
│   │   └── auth-options.ts        # NextAuth configuration
│   ├── encryption.ts              # AES-256 encrypt/decrypt
│   ├── validators/                # Zod schemas
│   └── utils.ts                   # General helpers
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Migration history
│
├── python-service/                # Python microservice
│   ├── app/
│   │   ├── main.py                # FastAPI entry
│   │   ├── api/
│   │   │   └── scrape_routes.py
│   │   ├── scrapers/
│   │   │   ├── base.py
│   │   │   ├── naukri.py
│   │   │   ├── remoteok.py
│   │   │   └── wellfound.py
│   │   ├── parsers/
│   │   │   └── query_parser.py
│   │   ├── normalizers/
│   │   │   └── job_normalizer.py
│   │   ├── db/
│   │   │   └── repository.py
│   │   └── config.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── tests/
│
├── tests/                         # Frontend tests
│   ├── unit/                      # Vitest unit tests
│   └── e2e/                       # Playwright E2E tests
│
├── public/                        # Static assets
├── .env.example
├── .env.local                     # Local dev secrets (gitignored)
├── .gitignore
├── docker-compose.yml
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── README.md
```

---

## 14. Technology Decisions

### 14.1 Final Stack Summary

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Runtime** | Node.js | 20 LTS | Next.js server |
| **Framework** | Next.js | 15 | App Router, Server Components, Server Actions |
| **Language** | TypeScript | 5.x | Strict mode |
| **Styling** | Tailwind CSS | 4.x | Reused from Resume Shapeshifter |
| **UI Library** | shadcn/ui + Radix | Latest | Accessible, composable primitives |
| **Icons** | Lucide React | Latest | Consistent icon set |
| **Auth** | NextAuth.js | v5 | Credentials provider, JWT sessions |
| **ORM** | Prisma | 6.x | Type-safe DB access from Next.js |
| **Database** | PostgreSQL | 16 | Neon (serverless) for prod, Docker for dev |
| **Python Service** | FastAPI | 0.115+ | Async scraping API |
| **Python ORM** | SQLAlchemy | 2.x | DB access from Python service |
| **Scraping** | Playwright | Latest | Headless Chrome for Naukri |
| **LLM (primary)** | Groq | Llama 3.3 70B | Fast inference for resume/email |
| **LLM (fallback)** | DeepSeek | v4-flash | Backup + query parsing |
| **Email** | Nodemailer | 6.x | SMTP/Gmail sending from Next.js |
| **PDF** | @sparticuz/chromium | Latest | Serverless PDF generation |
| **Validation** | Zod | 3.x | Schema validation (API + forms) |
| **Forms** | React Hook Form | 7.x | Form state management |
| **Testing** | Vitest + Playwright | Latest | Unit + E2E |
| **Deployment** | Vercel + Railway | — | Split deployment by runtime |
| **File Storage** | Vercel Blob or S3 | — | Resume PDF storage |

### 14.2 Key Architecture Trade-offs

| Decision | Alternative Considered | Why We Chose This |
|----------|----------------------|-------------------|
| **Monorepo (Next.js + Python in one repo)** | Separate repos per service | Simpler CI/CD, shared docs, easier to onboard. The Python service is small and focused. |
| **DB-polling SSE instead of WebSockets** | WebSocket (Socket.io) | SSE is simpler, works through Vercel, and is sufficient for unidirectional progress updates. |
| **PostgreSQL via Prisma** | MongoDB, SQLite | Relational data (jobs ↔ resumes ↔ emails) benefits from JOINs. Prisma gives type-safe access. |
| **Nodemailer in Next.js (not Python)** | Keep email sending in Python | Keeps the Python service focused on scraping only. Email logic is simpler in the same runtime as the LLM service. |
| **No dedicated job queue (MVP)** | Redis + BullMQ, Celery | YAGNI for MVP. FastAPI's `BackgroundTasks` + DB status fields are sufficient. Easy to upgrade later. |
| **Server-side credential encryption** | Client-side encryption, Vault | AES-256-GCM with a server-side key is pragmatic for MVP. No external dependency. |

---

*Architecture document v1.0 — June 15, 2026*
*Companion document: [problemStatement.md](./problemStatement.md)*
