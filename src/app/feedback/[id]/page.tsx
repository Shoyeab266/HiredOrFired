"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { getSession } from "@/lib/db";
import { formatDate } from "@/lib/interview";
import type { InterviewSession } from "@/types";

interface PageProps {
  params: { id: string };
}

export default function FeedbackPage({ params }: PageProps) {
  const router = useRouter();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession(params.id).then((s) => {
      if (!s || !s.feedback) {
        router.push("/");
        return;
      }
      setSession(s);
      setLoading(false);
    });
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-500">
        Loading feedback...
      </div>
    );
  }

  if (!session?.feedback) return null;

  const { feedback, config } = session;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Interview Feedback
        </h1>
        <p className="text-slate-500 text-sm">
          {config.role}
          {config.company && ` @ ${config.company}`} —{" "}
          {formatDate(session.startedAt)}
        </p>
      </div>

      <Card title="Overall Summary" className="mb-6">
        <p className="text-slate-700 leading-relaxed">{feedback.overallSummary}</p>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card title="Strengths">
          <ul className="space-y-2">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-green-500 shrink-0">+</span>
                {s}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Weaknesses">
          <ul className="space-y-2">
            {feedback.weaknesses.map((w, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-red-400 shrink-0">−</span>
                {w}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Suggested Improvements">
          <ul className="space-y-2">
            {feedback.suggestedImprovements.map((imp, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-brand-500 shrink-0">→</span>
                {imp}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Per-Question Feedback" className="mb-8">
        <div className="space-y-6">
          {feedback.perQuestionFeedback.map((qf, i) => (
            <div
              key={qf.questionId || i}
              className="border-b border-slate-100 last:border-0 pb-6 last:pb-0"
            >
              <h3 className="font-medium text-slate-900 mb-2">
                Q{i + 1}: {qf.question}
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-slate-500">Your answer: </span>
                  <span className="text-slate-700">{qf.candidateAnswer}</span>
                </div>
                <div className="bg-brand-50 rounded-lg p-3">
                  <span className="font-medium text-brand-700">Feedback: </span>
                  <span className="text-brand-900">{qf.feedback}</span>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <span className="font-medium text-green-700">
                    Sample better answer:{" "}
                  </span>
                  <span className="text-green-900">{qf.sampleBetterAnswer}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-3 justify-center">
        <Link href="/">
          <Button>New Interview</Button>
        </Link>
        <Link href="/history">
          <Button variant="secondary">View History</Button>
        </Link>
      </div>
    </div>
  );
}
