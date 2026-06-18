-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('discovered', 'resume_tailored', 'email_drafted', 'email_sent', 'response_received', 'interview', 'offer', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('drafted', 'sent', 'skipped', 'failed');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('job', 'resume', 'email', 'application');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('created', 'updated', 'sent', 'skipped', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "smtp_credentials_encrypted" TEXT,
    "api_keys_encrypted" TEXT,
    "dry_run_enabled" BOOLEAN NOT NULL DEFAULT true,
    "max_emails_per_day" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "base_resumes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "file_path" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "base_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "sources" TEXT[],
    "status" "ScrapeStatus" NOT NULL DEFAULT 'pending',
    "total_results" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "scrape_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_listings" (
    "id" TEXT NOT NULL,
    "scrape_session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "salary_range" TEXT,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "tags" TEXT[],
    "is_bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "posted_at" TIMESTAMP(3),
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_listing_id" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'discovered',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tailored_resumes" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "base_resume_id" TEXT NOT NULL,
    "job_listing_id" TEXT NOT NULL,
    "tailored_text" TEXT NOT NULL,
    "changes_summary" JSONB,
    "pdf_path" TEXT,
    "ats_score" DOUBLE PRECISION,
    "llm_model_used" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tailored_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_emails" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "job_listing_id" TEXT NOT NULL,
    "tailored_resume_id" TEXT,
    "recipient_email" TEXT NOT NULL,
    "recipient_name" TEXT,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_plain" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'drafted',
    "is_dry_run" BOOLEAN NOT NULL DEFAULT true,
    "smtp_message_id" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" "AuditEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "base_resumes_user_id_idx" ON "base_resumes"("user_id");

-- CreateIndex
CREATE INDEX "scrape_sessions_user_id_idx" ON "scrape_sessions"("user_id");

-- CreateIndex
CREATE INDEX "scrape_sessions_status_idx" ON "scrape_sessions"("status");

-- CreateIndex
CREATE INDEX "job_listings_user_id_idx" ON "job_listings"("user_id");

-- CreateIndex
CREATE INDEX "job_listings_scrape_session_id_idx" ON "job_listings"("scrape_session_id");

-- CreateIndex
CREATE INDEX "job_listings_source_idx" ON "job_listings"("source");

-- CreateIndex
CREATE INDEX "job_listings_is_bookmarked_idx" ON "job_listings"("is_bookmarked");

-- CreateIndex
CREATE INDEX "applications_user_id_idx" ON "applications"("user_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_job_listing_id_idx" ON "applications"("job_listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_user_id_job_listing_id_key" ON "applications"("user_id", "job_listing_id");

-- CreateIndex
CREATE INDEX "tailored_resumes_application_id_idx" ON "tailored_resumes"("application_id");

-- CreateIndex
CREATE INDEX "tailored_resumes_job_listing_id_idx" ON "tailored_resumes"("job_listing_id");

-- CreateIndex
CREATE INDEX "outreach_emails_application_id_idx" ON "outreach_emails"("application_id");

-- CreateIndex
CREATE INDEX "outreach_emails_job_listing_id_idx" ON "outreach_emails"("job_listing_id");

-- CreateIndex
CREATE INDEX "outreach_emails_status_idx" ON "outreach_emails"("status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "base_resumes" ADD CONSTRAINT "base_resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrape_sessions" ADD CONSTRAINT "scrape_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_scrape_session_id_fkey" FOREIGN KEY ("scrape_session_id") REFERENCES "scrape_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_listing_id_fkey" FOREIGN KEY ("job_listing_id") REFERENCES "job_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailored_resumes" ADD CONSTRAINT "tailored_resumes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailored_resumes" ADD CONSTRAINT "tailored_resumes_base_resume_id_fkey" FOREIGN KEY ("base_resume_id") REFERENCES "base_resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailored_resumes" ADD CONSTRAINT "tailored_resumes_job_listing_id_fkey" FOREIGN KEY ("job_listing_id") REFERENCES "job_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_emails" ADD CONSTRAINT "outreach_emails_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_emails" ADD CONSTRAINT "outreach_emails_job_listing_id_fkey" FOREIGN KEY ("job_listing_id") REFERENCES "job_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_emails" ADD CONSTRAINT "outreach_emails_tailored_resume_id_fkey" FOREIGN KEY ("tailored_resume_id") REFERENCES "tailored_resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
