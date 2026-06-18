# Problem Statement: AI-Powered Job Application Platform

## 1. Background & Motivation

The modern job search process is fragmented, repetitive, and time-consuming. A typical job seeker must juggle **three separate workflows** — each involving different tools, platforms, and manual effort:

1. **Discovering relevant job listings** across multiple job boards (Naukri, RemoteOK, Wellfound, etc.)
2. **Tailoring their resume** to match each specific job description and its keywords
3. **Crafting and sending personalized cold outreach emails** to recruiters, hiring managers, or referrals at target companies

Today, these workflows exist as **three independent, disconnected projects**:

| # | Project | Repository | Description |
|---|---------|-----------|-------------|
| 1 | **Job Agent (Job Scrapper)** | [job-scrapper](https://github.com/Faaz345/job-scrapper) | Python CLI that scrapes job listings from Naukri, RemoteOK, and Wellfound into structured CSV files. Uses Playwright for headless browser scraping, Firecrawl API for Wellfound, and DeepSeek AI for natural-language query parsing. |
| 2 | **Resume Shapeshifter** | [resume-shapeshifter](https://github.com/Faaz345/resume-shapeshifter) | Next.js web application that uses LLM APIs (Groq/DeepSeek) to intelligently tailor a user's resume to a specific job description. Highlights matching skills, rewords experience bullets, and generates an optimized, ATS-friendly resume. Built with TypeScript, Tailwind CSS, and Radix UI. |
| 3 | **The Closer (Cold Email Sender)** | [cold-email-sender](https://github.com/Faaz345/cold-email-sender) | Python CLI with a human-in-the-loop workflow that loads outreach targets, generates personalized cold emails using AI, previews each one, and sends via Gmail/SMTP — with dry-run mode, volume caps, and a full audit trail. |

---

## 2. The Core Problem

> **Job seekers are forced to manually bridge the gap between discovering opportunities, customizing their application materials, and conducting outreach — resulting in lost time, inconsistent quality, and missed opportunities.**

### 2.1 Specific Pain Points

- **Workflow Fragmentation**: Each step (search → tailor → outreach) requires switching between different tools, formats, and interfaces. There is no shared data pipeline connecting them.
- **Manual Data Transfer**: Job listing data exported as CSV from the scraper must be manually copied/reformatted before it can inform resume tailoring or cold email generation.
- **No Unified Dashboard**: Users cannot track the end-to-end status of their applications — which jobs they found, which resumes they tailored, which emails they sent, and what responses they received.
- **Inconsistent UX**: The job scraper and email sender are Python CLIs, while the resume tailorer is a Next.js web app. Users must context-switch between terminals and browsers.
- **No Application Memory**: There is no centralized record linking a scraped job → the tailored resume generated for it → the outreach email sent for that application. Each tool operates in isolation.
- **Scalability Issues**: Manually repeating this cycle for dozens or hundreds of job applications is unsustainable.

---

## 3. Proposed Solution

Build a **unified, full-stack AI-powered Job Application Platform** that integrates all three projects into a single cohesive product with a shared data model, a modern web UI, and an automated pipeline.

### 3.1 Platform Vision

```
┌─────────────────────────────────────────────────────────────────────┐
│                   AI Job Application Platform                       │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  1. DISCOVER  │───▶│  2. TAILOR        │───▶│  3. OUTREACH     │  │
│  │              │    │                  │    │                  │  │
│  │ Job Scraper  │    │ Resume           │    │ Cold Email       │  │
│  │ Module       │    │ Shapeshifter     │    │ Sender Module    │  │
│  │              │    │ Module           │    │                  │  │
│  │ • Naukri     │    │ • AI Resume      │    │ • AI Email Gen   │  │
│  │ • RemoteOK   │    │   Tailoring      │    │ • Gmail/SMTP     │  │
│  │ • Wellfound  │    │ • ATS Scoring    │    │ • Human Review   │  │
│  │ • AI Query   │    │ • PDF Export     │    │ • Audit Trail    │  │
│  └──────┬───────┘    └────────┬─────────┘    └────────┬─────────┘  │
│         │                     │                       │            │
│         └─────────────────────┼───────────────────────┘            │
│                               │                                    │
│                    ┌──────────▼──────────┐                         │
│                    │  UNIFIED DASHBOARD  │                         │
│                    │                     │                         │
│                    │ • Application       │                         │
│                    │   Tracker           │                         │
│                    │ • Analytics         │                         │
│                    │ • Pipeline Status   │                         │
│                    └─────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Key Integration Points

| From → To | Data Flow | Automation |
|-----------|-----------|------------|
| **Scraper → Resume Tailorer** | Job title, description, company name, required skills, JD URL | One-click: select a scraped job → auto-populate the tailoring form with that job's description |
| **Scraper → Email Sender** | Company name, recruiter/contact info (if available), job title, application URL | Auto-generate outreach targets from scraped listings |
| **Resume Tailorer → Email Sender** | Tailored resume PDF (as attachment), key talking points extracted during tailoring | Attach the tailored resume and reference matched skills in the email body |
| **All Modules → Dashboard** | Job status, resume version, email sent/draft/skipped, response tracking | Unified timeline view per application |

---

## 4. Functional Requirements

### 4.1 Module 1: Job Discovery Engine (from Job Scrapper)

- **FR-1.1**: Users can search for jobs using natural-language queries (e.g., "Backend Developer in Mumbai, remote-friendly")
- **FR-1.2**: Platform scrapes listings from multiple sources — Naukri (via Playwright), RemoteOK (via API), Wellfound (via Firecrawl)
- **FR-1.3**: Results are normalized into a unified schema (title, company, location, salary range, description, URL, source, date posted)
- **FR-1.4**: Users can filter, sort, and bookmark scraped jobs through the web UI
- **FR-1.5**: Users can select one or more jobs to initiate the tailoring or outreach workflows

### 4.2 Module 2: Resume Tailoring Engine (from Resume Shapeshifter)

- **FR-2.1**: Users upload their base resume (PDF or paste text)
- **FR-2.2**: When a job is selected from the discovery module, its description auto-populates the tailoring form
- **FR-2.3**: AI (Groq/DeepSeek) rewrites and optimizes the resume for the specific role
- **FR-2.4**: Users can preview, edit, and download the tailored resume as PDF
- **FR-2.5**: Each tailored resume is linked to its corresponding job listing in the database

### 4.3 Module 3: Outreach Engine (from Cold Email Sender)

- **FR-3.1**: Platform generates personalized cold emails using AI, referencing the job listing and tailored resume highlights
- **FR-3.2**: Human-in-the-loop review: users preview, edit, and explicitly approve each email before sending
- **FR-3.3**: Supports Gmail/SMTP sending with App Password authentication
- **FR-3.4**: Dry-run mode for safe testing (no actual emails sent)
- **FR-3.5**: Volume caps and safety controls to prevent accidental mass sends
- **FR-3.6**: Full audit trail logging every outreach attempt (sent, drafted, skipped)

### 4.4 Module 4: Application Dashboard (New)

- **FR-4.1**: Kanban-style board tracking each application through stages: Discovered → Resume Tailored → Email Sent → Response Received → Interview → Offer
- **FR-4.2**: Timeline view per job showing all actions taken (scraped, resume generated, email sent)
- **FR-4.3**: Analytics: application count by source, response rates, most active companies
- **FR-4.4**: Search and filter across all applications

---

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Architecture** | Full-stack web application with a unified backend API |
| **Frontend** | Modern responsive web UI (Next.js / React) with a premium design |
| **Backend** | API layer orchestrating scraping, AI tailoring, and email sending |
| **Database** | Persistent storage for jobs, resumes, emails, and application state |
| **Authentication** | User accounts with secure credential storage for SMTP and API keys |
| **Security** | SMTP credentials encrypted at rest; no plaintext secrets in the database |
| **Performance** | Scraping runs async with progress indicators; UI remains responsive |
| **Scalability** | Support managing 100+ concurrent job applications per user |
| **Safety** | Retain dry-run mode, human-in-the-loop email approval, and volume caps |

---

## 6. Technology Stack (Proposed)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS | Reuse Resume Shapeshifter's existing stack; SSR for performance |
| **Backend API** | Next.js API Routes + Python microservice (FastAPI) | API routes for UI-facing logic; Python service for scraping (Playwright) |
| **AI / LLM** | Groq (Llama 3.3 70B), DeepSeek | Already integrated in existing projects |
| **Database** | PostgreSQL (via Prisma ORM) or SQLite for MVP | Structured relational data for jobs, resumes, emails, users |
| **Email** | Nodemailer (SMTP/Gmail) | Server-side email sending with template support |
| **Scraping** | Playwright (headless Chrome), Firecrawl API | Proven stack from Job Scrapper |
| **PDF Generation** | Puppeteer / `@sparticuz/chromium` | Already used in Resume Shapeshifter for PDF export |
| **Deployment** | Vercel (frontend) + Railway/Fly.io (Python scraper) | Vercel already configured in Resume Shapeshifter |

---

## 7. Source Projects Reference

### 7.1 Job Scrapper (`job-scrapper`)

- **Language**: Python
- **Interface**: CLI (`python -m job_agent`)
- **Sources**: Naukri (Playwright headless), RemoteOK (API), Wellfound (Firecrawl)
- **AI**: DeepSeek for natural-language query parsing
- **Output**: CSV files with structured job listings
- **Key Dependencies**: Playwright, Firecrawl API, python-dotenv

### 7.2 Resume Shapeshifter (`resume-shapeshifter`)

- **Language**: TypeScript
- **Framework**: Next.js (App Router)
- **Interface**: Web application with workspace UI
- **AI**: Groq (Llama 3.3 70B) / DeepSeek for resume tailoring
- **UI**: Tailwind CSS, Radix UI, Lucide icons, shadcn/ui
- **Testing**: Vitest (unit), Playwright (E2E)
- **Key Dependencies**: `@sparticuz/chromium` (PDF), `class-variance-authority`, `clsx`

### 7.3 The Closer / Cold Email Sender (`cold-email-sender`)

- **Language**: Python
- **Interface**: CLI with interactive prompts (`python main.py`)
- **Sending**: Gmail SMTP with App Password
- **Safety**: Dry-run by default, human-in-the-loop confirmation, volume caps (`MAX_OUTREACH_PER_RUN`)
- **Input**: JSON/CSV contacts file
- **Output**: Audit log CSV (`logs/outreach_log.csv`)
- **Modes**: `send` (SMTP delivery), `draft` (preview only)

---

## 8. Success Criteria

1. **End-to-End Flow**: A user can go from "search for jobs" → "tailor resume" → "send outreach email" without leaving the platform
2. **Data Continuity**: Every tailored resume and outreach email is linked back to its source job listing
3. **Time Savings**: Reduce the per-application effort from ~30 minutes (manual) to ~5 minutes (AI-assisted with one-click flows)
4. **Safety Preserved**: All existing safety mechanisms (dry-run, human review, audit trail, volume caps) are retained in the unified platform
5. **Production Quality**: The platform has a polished, responsive UI with a premium user experience — not a patchwork of three tools

---

## 9. Out of Scope (v1)

- Multi-user / team features
- Payment / subscription billing
- Browser extension for scraping
- LinkedIn integration
- Automated interview scheduling
- Mobile native app (responsive web only)

---

*Document created: June 15, 2026*
*Source repositories: [job-scrapper](https://github.com/Faaz345/job-scrapper) · [resume-shapeshifter](https://github.com/Faaz345/resume-shapeshifter) · [cold-email-sender](https://github.com/Faaz345/cold-email-sender)*
