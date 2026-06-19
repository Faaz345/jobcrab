"use client";

import { useEffect, useState, useRef } from "react";
import { CheckCircle, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CrabIcon } from "@/components/icons/crab";

interface ScrapeProgressProps {
  sessionId: string;
  onComplete: () => void;
  onJobsUpdate: (jobs: any[]) => void;
}

const THINKING_MESSAGES = [
  "Awakening AI agents...",
  "Analyzing job requirements...",
  "Searching job boards...",
  "Extracting details...",
  "Filtering matches...",
];

export function ScrapeProgress({
  sessionId,
  onComplete,
  onJobsUpdate,
}: ScrapeProgressProps) {
  const [status, setStatus] = useState<string>("running");
  const [totalJobs, setTotalJobs] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  // Cycle through thinking messages
  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/jobs/search/${sessionId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.total_jobs !== undefined) {
          setTotalJobs(data.total_jobs);
        }

        if (data.new_jobs?.length) {
          onJobsUpdate(data.new_jobs);
        }

        if (data.completed || data.status === "completed") {
          setStatus("completed");
          es.close();
          // Delay onComplete slightly to show the completed state
          setTimeout(() => onComplete(), 2000);
        }

        if (data.status === "failed") {
          setStatus("failed");
          es.close();
          setTimeout(() => onComplete(), 2000);
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    es.onerror = () => {
      setStatus("failed");
      es.close();
      setTimeout(() => onComplete(), 2000);
    };

    return () => {
      es.close();
    };
  }, [sessionId, onComplete, onJobsUpdate]);

  return (
    <div className="relative flex items-center h-[42px] px-4 rounded-lg bg-primary/5 border border-primary/20 overflow-hidden shadow-inner">
      <AnimatePresence mode="wait">
        {status === "running" && (
          <motion.div
            key="running"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 w-full"
          >
            {/* Animated JobCrab Indicator */}
            <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/50"
                animate={{
                  scale: [1, 2, 2.5],
                  opacity: [0.8, 0.4, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-primary/30"
                animate={{
                  scale: [1, 1.5, 2],
                  opacity: [0.6, 0.2, 0],
                }}
                transition={{
                  duration: 2,
                  delay: 0.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <CrabIcon className="w-[14px] h-[14px] text-primary relative z-10" />
            </div>

            {/* Changing Text */}
            <div className="flex-1 overflow-hidden relative h-5">
              <AnimatePresence mode="wait">
                <motion.span
                  key={messageIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 text-sm font-medium text-primary truncate"
                >
                  {THINKING_MESSAGES[messageIndex]}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Jobs counter badge */}
            <motion.div
              key={totalJobs}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background border shadow-sm text-xs font-medium whitespace-nowrap shrink-0"
            >
              <Zap className="h-3 w-3 text-amber-500" />
              <span className="text-foreground">{totalJobs} found</span>
            </motion.div>
          </motion.div>
        )}

        {status === "completed" && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 w-full text-green-500 font-medium text-sm"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Found {totalJobs} jobs successfully!</span>
          </motion.div>
        )}

        {status === "failed" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center w-full text-red-500 text-sm font-medium"
          >
            Search failed. Try again.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
