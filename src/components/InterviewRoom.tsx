"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Timer from "@/components/Timer";
import { getSession, updateSession, getSettings } from "@/lib/db";
import { getRemainingMinutes, isTimeUp, getInterviewerDisplayName } from "@/lib/interview";
import { INTERVIEWER_LABEL, INTERVIEWER_NAME } from "@/lib/constants";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useCameraPreview } from "@/hooks/useCameraPreview";
import type {
  ChatApiResponse,
  ChatMessage,
  FeedbackReport,
  InterviewSession,
} from "@/types";
import { DIFFICULTY_OPTIONS } from "@/types";

interface InterviewRoomProps {
  sessionId: string;
}

export default function InterviewRoom({ sessionId }: InterviewRoomProps) {
  const router = useRouter();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [answerMode, setAnswerMode] = useState<"voice" | "text">("voice");
  const [textAnswer, setTextAnswer] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(15);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const endingRef = useRef(false);
  const answerModeRef = useRef<"voice" | "text">("voice");
  const speechRecSupportedRef = useRef(false);

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [preferredVoice, setPreferredVoice] = useState<string | undefined>();

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: speechRecSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const { isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis(
    speechRate,
    speechPitch,
    preferredVoice
  );

  const {
    videoRef,
    isActive: cameraActive,
    error: cameraError,
    isSupported: cameraSupported,
    startCamera,
    stopCamera,
  } = useCameraPreview();

  useEffect(() => {
    getSettings().then((s) => {
      setVoiceEnabled(s.voiceEnabled);
      setSpeechRate(s.speechRate);
      setSpeechPitch(s.speechPitch);
      setPreferredVoice(s.preferredVoiceName);
    });
  }, []);

  useEffect(() => {
    getSession(sessionId).then((s) => {
      if (!s) {
        router.push("/");
        return;
      }
      setSession(s);
      setRemainingMinutes(getRemainingMinutes(s.startedAt, s.config.durationMinutes));
      setLoading(false);
    });
  }, [sessionId, router]);

  useEffect(() => {
    if (loading || !session || !cameraSupported) return;
    startCamera();
  }, [loading, session, cameraSupported, startCamera]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      const remaining = getRemainingMinutes(
        session.startedAt,
        session.config.durationMinutes
      );
      setRemainingMinutes(remaining);
      if (remaining <= 0 && !endingRef.current) {
        endingRef.current = true;
        handleEndInterview(true);
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    answerModeRef.current = answerMode;
  }, [answerMode]);

  useEffect(() => {
    speechRecSupportedRef.current = speechRecSupported;
  }, [speechRecSupported]);

  const beginAutoRecording = useCallback(() => {
    if (
      answerModeRef.current !== "voice" ||
      !speechRecSupportedRef.current ||
      endingRef.current
    ) {
      return;
    }
    resetTranscript();
    startListening();
  }, [resetTranscript, startListening]);

  const callAI = useCallback(
    async (
      action: "start_interview" | "next_turn",
      currentSession: InterviewSession
    ): Promise<ChatApiResponse | null> => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          config: currentSession.config,
          messages: currentSession.messages,
          followUpCounts: currentSession.followUpCounts,
          timeRemainingMinutes: getRemainingMinutes(
            currentSession.startedAt,
            currentSession.config.durationMinutes
          ),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "AI request failed");
      }

      return res.json();
    },
    []
  );

  const addInterviewerMessage = useCallback(
    async (response: ChatApiResponse, currentSession: InterviewSession) => {
      const msg: ChatMessage = {
        role: "interviewer",
        content: response.message,
        timestamp: Date.now(),
        isFollowUp: response.isFollowUp,
        questionId: response.questionId,
        parentQuestionId: response.parentQuestionId,
      };

      const updates: Partial<InterviewSession> = {
        messages: [...currentSession.messages, msg],
      };

      if (response.isFollowUp && response.parentQuestionId) {
        const counts = { ...currentSession.followUpCounts };
        counts[response.parentQuestionId] =
          (counts[response.parentQuestionId] || 0) + 1;
        updates.followUpCounts = counts;
      }

      if (response.isCandidateAskingQuestion) {
        updates.candidateQuestionWarnings =
          currentSession.candidateQuestionWarnings + 1;
        if (response.warningMessage) {
          setWarning(response.warningMessage);
        }
      }

      await updateSession(sessionId, updates);
      const updated = { ...currentSession, ...updates } as InterviewSession;
      setSession(updated);

      stopListening();
      if (voiceEnabled) {
        await speak(response.message);
      }

      if (!response.isInterviewComplete) {
        beginAutoRecording();
      }

      return { updated, isComplete: response.isInterviewComplete };
    },
    [sessionId, voiceEnabled, speak, stopListening, beginAutoRecording]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

  useEffect(() => {
    if (!session || hasStartedRef.current || loading) return;
    if (session.messages.length > 0) {
      hasStartedRef.current = true;
      return;
    }

    hasStartedRef.current = true;
    setIsProcessing(true);

    callAI("start_interview", session)
      .then(async (response) => {
        if (!response) return;
        const result = await addInterviewerMessage(response, session);
        if (result?.isComplete) {
          await handleEndInterview(true);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsProcessing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading]);

  const handleEndInterview = async (autoEnd = false) => {
    if (!session || (endingRef.current && !autoEnd)) return;
    endingRef.current = true;
    stopListening();
    stopSpeaking();
    stopCamera();
    setIsProcessing(true);

    await updateSession(sessionId, {
      status: "generating_feedback",
      endedAt: Date.now(),
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_feedback",
          config: session.config,
          messages: session.messages,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Feedback generation failed");
      }

      const data = await res.json();
      const feedback: FeedbackReport = data.feedback;

      await updateSession(sessionId, {
        status: "completed",
        feedback,
      });

      router.push(`/feedback/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate feedback");
      endingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!session || isProcessing) return;

    const answer =
      answerMode === "voice"
        ? transcript.trim()
        : textAnswer.trim();

    if (!answer) return;

    stopListening();
    setIsProcessing(true);
    setWarning(null);

    const candidateMsg: ChatMessage = {
      role: "candidate",
      content: answer,
      timestamp: Date.now(),
    };

    const updatedMessages = [...session.messages, candidateMsg];
    const updatedSession = { ...session, messages: updatedMessages };
    await updateSession(sessionId, { messages: updatedMessages });
    setSession(updatedSession);
    resetTranscript();
    setTextAnswer("");

    try {
      const response = await callAI("next_turn", updatedSession);
      if (!response) return;

      const result = await addInterviewerMessage(response, updatedSession);

      if (
        result?.isComplete ||
        isTimeUp(updatedSession.startedAt, updatedSession.config.durationMinutes)
      ) {
        await handleEndInterview(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-500">
        Loading interview...
      </div>
    );
  }

  if (!session) return null;

  const difficultyLabel =
    DIFFICULTY_OPTIONS.find((d) => d.value === (session.config.difficulty ?? "moderate"))
      ?.label ?? "Moderate";

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {session.config.role}
            {session.config.company && (
              <span className="text-slate-500 font-normal">
                {" "}
                @ {session.config.company}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500">
            {session.config.durationMinutes} min interview · {difficultyLabel}
          </p>
        </div>
        <div className="flex items-start gap-3 shrink-0">
          <div className="relative w-36 sm:w-44 aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-200 shadow-sm">
            {cameraSupported ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover mirror ${cameraActive ? "opacity-100" : "opacity-0"}`}
                />
                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                    Starting camera...
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-slate-400">
                    Camera unavailable
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-slate-400">
                Camera not supported
              </div>
            )}
          </div>
          <Timer
            remainingMinutes={remainingMinutes}
            totalMinutes={session.config.durationMinutes}
          />
        </div>
      </div>

      {cameraError && (
        <div className="mb-4 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-lg px-4 py-3">
          Could not access your camera: {cameraError}. You can continue the interview without the preview.
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
          <button
            className="ml-2 underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {warning && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          {warning}
        </div>
      )}

      <Card className="mb-4">
        <div className="h-96 overflow-y-auto space-y-4 pr-2">
          {session.messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "candidate" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "interviewer"
                    ? "bg-brand-50 text-brand-900 border border-brand-100"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <span className="text-xs font-medium block mb-1 opacity-60">
                  {msg.role === "interviewer"
                    ? getInterviewerDisplayName(session.messages, i)
                    : "You"}
                  {msg.isFollowUp && " (follow-up)"}
                </span>
                {msg.content}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-brand-50 rounded-xl px-4 py-3 text-sm text-brand-600 animate-pulse">
                {INTERVIEWER_LABEL} is thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      <Card>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              if (answerMode !== "voice") stopListening();
              setAnswerMode("voice");
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              answerMode === "voice"
                ? "bg-brand-100 text-brand-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Voice
          </button>
          <button
            onClick={() => {
              stopListening();
              setAnswerMode("text");
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              answerMode === "text"
                ? "bg-brand-100 text-brand-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Text
          </button>
        </div>

        {answerMode === "voice" ? (
          <div className="space-y-3">
            {!speechRecSupported && (
              <p className="text-sm text-amber-600">
                Speech recognition is not supported in this browser. Please use
                Chrome or Edge, or switch to text mode.
              </p>
            )}
            <div className="min-h-[80px] p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700">
              {transcript || interimTranscript || (
                <span className="text-slate-400">
                  {isListening
                    ? "Listening..."
                    : isSpeaking
                      ? `${INTERVIEWER_LABEL} is speaking...`
                      : isProcessing
                        ? `${INTERVIEWER_LABEL} is preparing the next question...`
                        : "Recording starts automatically after each question"}
                </span>
              )}
              {interimTranscript && (
                <span className="text-slate-400"> {interimTranscript}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant={isListening ? "danger" : "secondary"}
                onClick={toggleListening}
                disabled={!speechRecSupported || isProcessing || isSpeaking}
                className="flex-1"
              >
                {isListening ? "Stop Recording" : "Start Recording"}
              </Button>
              <Button
                onClick={handleSubmitAnswer}
                disabled={
                  !transcript.trim() || isProcessing || isSpeaking
                }
              >
                Submit Answer
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none text-sm"
              disabled={isProcessing || isSpeaking}
            />
            <Button
              onClick={handleSubmitAnswer}
              disabled={!textAnswer.trim() || isProcessing || isSpeaking}
              className="w-full"
            >
              Submit Answer
            </Button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEndInterview()}
            disabled={isProcessing}
          >
            End Interview Early
          </Button>
          {(isSpeaking || isListening) && (
            <Button variant="ghost" size="sm" onClick={() => { stopSpeaking(); stopListening(); }}>
              Stop Audio
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
