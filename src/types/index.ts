export type MessageRole = "interviewer" | "candidate" | "system";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: number;
  isFollowUp?: boolean;
  parentQuestionId?: string;
  questionId?: string;
}

export type SessionStatus = "setup" | "active" | "generating_feedback" | "completed";

export type InterviewDifficulty = "easy" | "moderate" | "difficult";

export interface InterviewConfig {
  role: string;
  topic?: string;
  company?: string;
  durationMinutes: number;
  difficulty: InterviewDifficulty;
}

export const DIFFICULTY_OPTIONS = [
  { value: "easy" as const, label: "Easy" },
  { value: "moderate" as const, label: "Moderate" },
  { value: "difficult" as const, label: "Difficult" },
];

export interface QuestionFeedback {
  questionId: string;
  question: string;
  candidateAnswer: string;
  feedback: string;
  sampleBetterAnswer: string;
}

export interface FeedbackReport {
  strengths: string[];
  weaknesses: string[];
  suggestedImprovements: string[];
  perQuestionFeedback: QuestionFeedback[];
  overallSummary: string;
  generatedAt: number;
}

export interface InterviewSession {
  id: string;
  config: InterviewConfig;
  status: SessionStatus;
  messages: ChatMessage[];
  startedAt: number;
  endedAt?: number;
  followUpCounts: Record<string, number>;
  candidateQuestionWarnings: number;
  feedback?: FeedbackReport;
}

export interface AppSettings {
  voiceEnabled: boolean;
  speechRate: number;
  speechPitch: number;
  preferredVoiceName?: string;
  defaultDurationMinutes: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  voiceEnabled: true,
  speechRate: 1,
  speechPitch: 1,
  defaultDurationMinutes: 15,
};

export const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

export type ChatApiAction =
  | "start_interview"
  | "next_turn"
  | "generate_feedback";

export interface ChatApiRequest {
  action: ChatApiAction;
  config?: InterviewConfig;
  messages?: ChatMessage[];
  followUpCounts?: Record<string, number>;
  timeRemainingMinutes?: number;
}

export interface ChatApiResponse {
  message: string;
  isFollowUp?: boolean;
  questionId?: string;
  parentQuestionId?: string;
  isCandidateAskingQuestion?: boolean;
  warningMessage?: string;
  isInterviewComplete?: boolean;
  provider?: "gemini" | "groq";
}

export interface FeedbackApiRequest {
  config: InterviewConfig;
  messages: ChatMessage[];
}

export interface FeedbackApiResponse {
  feedback: FeedbackReport;
  provider?: "gemini" | "groq";
}
