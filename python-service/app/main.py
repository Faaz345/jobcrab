"""
FastAPI microservice for the Job Crab Platform.
Handles job scraping from Naukri, RemoteOK, and Wellfound.
"""

import sys
import asyncio

# On Windows, Playwright's async API launches the browser via a subprocess,
# which requires the Proactor event loop. uvicorn otherwise defaults to the
# Selector loop, where subprocess creation raises NotImplementedError and the
# Naukri (Playwright) scraper silently fails. Force Proactor on Windows.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.scrape_routes import router as scrape_router

app = FastAPI(
    title="Job Crab - Scraping Service",
    description="Python microservice for job scraping across multiple boards",
    version="0.1.0",
)

# Include routers
app.include_router(scrape_router)

# CORS — allow the Next.js frontend to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "scraping-service", "version": "0.1.1-testing-scrapers"}


@app.get("/")
async def root():
    """Root endpoint with service info."""
    return {
        "service": "Job Crab Scraping Service",
        "docs": "/docs",
        "health": "/health",
    }
