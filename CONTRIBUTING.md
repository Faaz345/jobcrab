# Contributing to JobCrab

## Project Structure

```
app/                      Next.js App Router (pages + API routes)
  (dashboard)/            Authenticated dashboard segment
  api/                    REST API route handlers
components/
  ui/                     shadcn/ui primitives
  jobs/ resume/ outreach/ dashboard/ shared/   Feature components
lib/
  services/               Business logic (LLM, email, resume, applications)
  validators/             Zod schemas for all API inputs
  db/                     Prisma client singleton
  auth/                   NextAuth config + session helpers
prisma/                   Prisma schema
python-service/           FastAPI scraping microservice
  app/scrapers/           RemoteOK / Naukri / Wellfound + shared matching
  app/parsers/            Natural-language query parser
  app/normalizers/        Raw -> unified job normalization
  tests/                  pytest suite
tests/unit/               Vitest unit tests
```

## Coding Conventions

### TypeScript / React
- Use the App Router. Server components by default; add `"use client"` only when needed.
- Validate every API input with a Zod schema from `lib/validators/`.
- Keep business logic in `lib/services/`, not in route handlers.
- Use `getSession()` for auth in API routes; return `401` when unauthenticated.
- Use shadcn/ui primitives and Tailwind utility classes. Match the existing dark theme.
- Use `sonner` toasts for mutation feedback (success/error).

### Python
- Each scraper subclasses `BaseScraper` and returns `RawJobListing` objects.
- Keep role-matching logic in `app/scrapers/matching.py` (shared across scrapers).
- Playwright-based scrapers must run in a dedicated Proactor event-loop thread on Windows.
- Write files as UTF-8 without BOM.

## Running Tests

```bash
npm run test                               # TypeScript unit tests
cd python-service && python -m pytest tests # Python tests
```

Add a test for every new validator, service function, scraper helper, or normalizer.

## Commit / PR Guidelines
- Keep commits focused and descriptive.
- Ensure `npm run build` and both test suites pass before opening a PR.
- Do not commit secrets. Use `.env.local` / `python-service/.env` (gitignored).