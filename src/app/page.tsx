"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { createSession, generateId, getSettings } from "@/lib/db";
import {
  DIFFICULTY_OPTIONS,
  DURATION_OPTIONS,
  type InterviewConfig,
  type InterviewDifficulty,
  type InterviewSession,
} from "@/types";

export default function HomePage() {
  const router = useRouter();
  const roleRef = useRef<HTMLInputElement>(null);
  const topicRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState("");
  const [topic, setTopic] = useState("");
  const [company, setCompany] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("moderate");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then((s) => setDurationMinutes(s.defaultDurationMinutes));
  }, []);

  const handleStart = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    const roleValue = (role || roleRef.current?.value || "").trim();
    const topicValue = (topic || topicRef.current?.value || "").trim();
    const companyValue = (company || companyRef.current?.value || "").trim();

    if (!roleValue) {
      setError("Please enter a job role to start the interview.");
      roleRef.current?.focus();
      return;
    }

    setIsStarting(true);

    try {
      const config: InterviewConfig = {
        role: roleValue,
        topic: topicValue || undefined,
        company: companyValue || undefined,
        durationMinutes,
        difficulty,
      };

      const session: InterviewSession = {
        id: generateId(),
        config,
        status: "active",
        messages: [],
        startedAt: Date.now(),
        followUpCounts: {},
        candidateQuestionWarnings: 0,
      };

      await createSession(session);
      router.push(`/interview/${session.id}`);
    } catch (err) {
      console.error("Failed to start interview:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not save the session. Check that your browser allows local storage."
      );
      setIsStarting(false);
    }
  };

  const showOptionalReminder = role.trim() && (!topic.trim() || !company.trim());

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
          Practice Your Interview
        </h1>
        <p className="text-slate-600 text-lg">
          Get interviewed by AI with voice and text. Receive detailed feedback
          when you&apos;re done.
        </p>
      </div>

      <Card title="Interview Setup">
        <form onSubmit={handleStart} className="space-y-5">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1.5">
              Job Role <span className="text-red-500">*</span>
            </label>
            <input
              ref={roleRef}
              id="role"
              name="role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
              autoComplete="off"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-1.5">
              Topic Focus
            </label>
            <input
              ref={topicRef}
              id="topic"
              name="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. React, System Design, Leadership"
              autoComplete="off"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1.5">
              Target Company
            </label>
            <input
              ref={companyRef}
              id="company"
              name="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Google, Stripe, Startup XYZ"
              autoComplete="off"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {showOptionalReminder && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
              Tip: Adding a topic and target company helps tailor your interview
              questions. You can still start without them.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-slate-700 mb-1.5">
              Difficulty Level
            </label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as InterviewDifficulty)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
            >
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Easy: foundational questions. Moderate: standard role questions. Difficult: deep technical and challenging follow-ups.
            </p>
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-1.5">
              Interview Duration
            </label>
            <select
              id="duration"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} minutes
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isStarting}
          >
            {isStarting ? "Starting..." : "Start Interview"}
          </Button>
        </form>
      </Card>

      <div className="mt-8 grid sm:grid-cols-3 gap-4 text-center">
        {[
          { title: "Voice + Text", desc: "Answer by speaking or typing" },
          { title: "Smart Follow-ups", desc: "AI adapts to your answers" },
          { title: "Detailed Feedback", desc: "Per-question coaching report" },
        ].map((f) => (
          <div key={f.title} className="p-4 rounded-lg bg-white border border-slate-200">
            <h3 className="font-semibold text-slate-900 text-sm">{f.title}</h3>
            <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
