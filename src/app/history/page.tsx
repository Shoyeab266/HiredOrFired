"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { deleteSession, getAllSessions } from "@/lib/db";
import { buildSessionTitle, formatDate } from "@/lib/interview";
import type { InterviewSession } from "@/types";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = () => {
    getAllSessions().then((s) => {
      setSessions(s);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this session permanently?")) return;
    await deleteSession(id);
    loadSessions();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-500">
        Loading history...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interview History</h1>
          <p className="text-slate-500 text-sm mt-1">
            All sessions are stored locally on your device.
          </p>
        </div>
        <Link href="/">
          <Button size="sm">New Interview</Button>
        </Link>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-slate-500 mb-4">No interviews yet.</p>
            <Link href="/">
              <Button>Start Your First Interview</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id} className="!p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-900 truncate">
                    {buildSessionTitle(session.config)}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {formatDate(session.startedAt)} ·{" "}
                    {session.config.durationMinutes} min ·{" "}
                    <span
                      className={
                        session.status === "completed"
                          ? "text-green-600"
                          : "text-amber-600"
                      }
                    >
                      {session.status === "completed"
                        ? "Completed"
                        : session.status === "generating_feedback"
                          ? "Generating feedback"
                          : "In progress"}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {session.status === "completed" && session.feedback && (
                    <Link href={`/feedback/${session.id}`}>
                      <Button size="sm" variant="secondary">
                        View Feedback
                      </Button>
                    </Link>
                  )}
                  {session.status === "active" && (
                    <Link href={`/interview/${session.id}`}>
                      <Button size="sm">Resume</Button>
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(session.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
