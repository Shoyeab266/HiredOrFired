import type { ChatMessage, InterviewConfig } from "@/types";
import { INTERVIEWER_LABEL, INTERVIEWER_NAME } from "@/lib/constants";

export function getInterviewerDisplayName(
  messages: ChatMessage[],
  messageIndex: number
): string {
  const msg = messages[messageIndex];
  if (msg.role !== "interviewer") return "You";

  const firstInterviewerIndex = messages.findIndex(
    (m) => m.role === "interviewer"
  );
  return messageIndex === firstInterviewerIndex
    ? INTERVIEWER_NAME
    : INTERVIEWER_LABEL;
}

export function formatTranscriptForLLM(messages: ChatMessage[]): string {
  let interviewerCount = 0;

  return messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      if (m.role === "interviewer") {
        interviewerCount += 1;
        const speaker =
          interviewerCount === 1 ? INTERVIEWER_NAME : INTERVIEWER_LABEL;
        return `${speaker}: ${m.content}`;
      }
      return `Candidate: ${m.content}`;
    })
    .join("\n\n");
}

export function getRemainingMinutes(
  startedAt: number,
  durationMinutes: number
): number {
  const elapsed = (Date.now() - startedAt) / 1000 / 60;
  return Math.max(0, durationMinutes - elapsed);
}

export function isTimeUp(
  startedAt: number,
  durationMinutes: number
): boolean {
  return getRemainingMinutes(startedAt, durationMinutes) <= 0;
}

export function formatDuration(minutes: number): string {
  const m = Math.floor(minutes);
  const s = Math.floor((minutes - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function buildSessionTitle(config: InterviewConfig): string {
  const parts = [config.role];
  if (config.company) parts.push(`@ ${config.company}`);
  return parts.join(" ");
}

export function canAskFollowUp(
  followUpCounts: Record<string, number>,
  parentQuestionId: string,
  isCandidateAskingQuestion: boolean
): boolean {
  if (isCandidateAskingQuestion) return true;
  const count = followUpCounts[parentQuestionId] || 0;
  return count < 2;
}

export function countMainQuestions(messages: ChatMessage[]): number {
  return messages.filter(
    (m) => m.role === "interviewer" && !m.isFollowUp
  ).length;
}
