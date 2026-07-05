import { NextRequest, NextResponse } from "next/server";
import {
  buildInterviewSystemPrompt,
  buildFeedbackSystemPrompt,
  callLLM,
  parseJSONResponse,
  type LLMMessage,
} from "@/lib/llm";
import { formatTranscriptForLLM } from "@/lib/interview";
import { INTERVIEWER_NAME } from "@/lib/constants";
import type {
  ChatApiRequest,
  ChatApiResponse,
  FeedbackApiRequest,
  FeedbackReport,
} from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatApiRequest | FeedbackApiRequest;

    if ("action" in body && body.action === "generate_feedback") {
      return handleFeedback(body as ChatApiRequest & FeedbackApiRequest);
    }

    const chatBody = body as ChatApiRequest;
    const { action, config, messages = [], followUpCounts = {}, timeRemainingMinutes = 15 } = chatBody;

    if (!config) {
      return NextResponse.json({ error: "Config is required" }, { status: 400 });
    }

    const systemPrompt = buildInterviewSystemPrompt(config, timeRemainingMinutes);
    const llmMessages: LLMMessage[] = [{ role: "system", content: systemPrompt }];

    if (action === "start_interview") {
      llmMessages.push({
        role: "user",
        content: `Start the interview. Your name is ${INTERVIEWER_NAME}. Introduce yourself briefly as ${INTERVIEWER_NAME}, then ask your first question for the ${config.role} role.${config.company ? ` The candidate is interviewing at ${config.company}.` : ""}${config.topic ? ` Focus area: ${config.topic}.` : ""}`,
      });
    } else {
      const transcript = formatTranscriptForLLM(messages);
      const followUpInfo = Object.entries(followUpCounts)
        .map(([qId, count]) => `${qId}: ${count} follow-ups used`)
        .join(", ");

      llmMessages.push({
        role: "user",
        content: `Interview transcript so far:\n\n${transcript}\n\nFollow-up counts: ${followUpInfo || "none yet"}\nTime remaining: ~${Math.round(timeRemainingMinutes)} minutes.\n\nBased on the candidate's latest answer, either ask the next main question, ask a follow-up (max 2 per main question unless candidate asked you a question), or conclude the interview if time is up. Do NOT use your name (${INTERVIEWER_NAME}) — you already introduced yourself. Refer to yourself as "the interviewer" if needed, or ask directly. Respond with JSON only.`,
      });
    }

    const { content, provider } = await callLLM(llmMessages);
    const parsed = parseJSONResponse<ChatApiResponse>(content);

    return NextResponse.json({ ...parsed, provider });
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleFeedback(
  body: ChatApiRequest & FeedbackApiRequest
) {
  const { config, messages } = body;

  if (!config || !messages?.length) {
    return NextResponse.json(
      { error: "Config and messages are required for feedback" },
      { status: 400 }
    );
  }

  const systemPrompt = buildFeedbackSystemPrompt(config);
  const transcript = formatTranscriptForLLM(messages);

  const llmMessages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Here is the complete interview transcript:\n\n${transcript}\n\nGenerate the feedback report as JSON.`,
    },
  ];

  const { content, provider } = await callLLM(llmMessages);
  const parsed = parseJSONResponse<Omit<FeedbackReport, "generatedAt">>(content);

  const feedback: FeedbackReport = {
    ...parsed,
    generatedAt: Date.now(),
  };

  return NextResponse.json({ feedback, provider });
}
