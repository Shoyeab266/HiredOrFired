import { INTERVIEWER_NAME } from "@/lib/constants";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResult {
  content: string;
  provider: "gemini" | "groq";
}

async function callGemini(messages: LLMMessage[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const contents = conversationMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  if (systemMessage) {
    body.systemInstruction = { parts: [{ text: systemMessage.content }] };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

async function callGroq(messages: LLMMessage[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned empty response");
  return text;
}

export async function callLLM(messages: LLMMessage[]): Promise<LLMResult> {
  try {
    const content = await callGemini(messages);
    return { content, provider: "gemini" };
  } catch (geminiError) {
    console.error("Gemini failed, falling back to Groq:", geminiError);
    try {
      const content = await callGroq(messages);
      return { content, provider: "groq" };
    } catch (groqError) {
      console.error("Groq also failed:", groqError);
      throw new Error(
        "Both AI providers failed. Please check your API keys and try again."
      );
    }
  }
}

const DIFFICULTY_GUIDANCE: Record<string, string> = {
  easy:
    "Easy — ask foundational and behavioral questions. Be encouraging. Use simpler wording. Limit follow-ups to 1 per main question unless the answer is unclear.",
  moderate:
    "Moderate — ask standard role-appropriate questions mixing technical and behavioral. Limit follow-ups to at most 2 per main question.",
  difficult:
    "Difficult — ask challenging, in-depth technical questions, edge cases, and trade-offs. Probe weak answers with demanding follow-ups (up to 3 per main question). Maintain a professional but evaluative tone.",
};

export function buildInterviewSystemPrompt(
  config: {
    role: string;
    topic?: string;
    company?: string;
    difficulty?: string;
  },
  timeRemainingMinutes: number
): string {
  const topicLine = config.topic
    ? `- Topic focus: ${config.topic}`
    : "- Topic focus: general topics relevant to the role";
  const companyLine = config.company
    ? `- Target company: ${config.company} (tailor questions accordingly)`
    : "- Target company: not specified";
  const difficulty = config.difficulty ?? "moderate";
  const difficultyLine = DIFFICULTY_GUIDANCE[difficulty] ?? DIFFICULTY_GUIDANCE.moderate;

  return `You are ${INTERVIEWER_NAME}, a professional interviewer conducting a mock job interview for HiredOrFired.

Naming rules (important):
- On your VERY FIRST message only: introduce yourself by name, e.g. "Hello, I'm ${INTERVIEWER_NAME}..."
- On ALL later messages: do NOT say your name (${INTERVIEWER_NAME}) again. Do not say "As ${INTERVIEWER_NAME}" or "I'm ${INTERVIEWER_NAME}". Refer to yourself as "the interviewer" only if absolutely necessary, or better — ask questions directly without naming yourself.

Interview context:
- Job role: ${config.role}
${topicLine}
${companyLine}
- Difficulty level: ${difficultyLine}
- Time remaining: approximately ${timeRemainingMinutes} minutes

Your responsibilities:
1. Ask questions primarily focused on the job role — mix technical questions relevant to that role with behavioral questions, but prioritize role-specific content. Match question depth and complexity to the difficulty level above.
2. Ask ONE question at a time. Keep questions clear and concise (2-4 sentences max when spoken aloud).
3. After the candidate answers, you may ask follow-up questions to dig deeper — respect the follow-up limits implied by the difficulty level unless the candidate asks YOU questions (see rule 4).
4. If the candidate asks YOU a question (interviewing the interviewer), answer briefly if appropriate, then redirect back to interviewing them. Flag this behavior.
5. When time is nearly up (under 3 minutes remaining), wrap up with a final question or conclude gracefully.
6. Do not repeat questions already asked.
7. Be professional, encouraging but evaluative in tone.

You MUST respond with valid JSON only, no markdown fences:
{
  "message": "Your question or statement to the candidate",
  "isFollowUp": false,
  "questionId": "unique-id-for-this-question",
  "parentQuestionId": null,
  "isCandidateAskingQuestion": false,
  "warningMessage": null,
  "isInterviewComplete": false
}

Field rules:
- "isFollowUp": true if this is a follow-up to a previous main question
- "parentQuestionId": the questionId of the main question if isFollowUp is true, else null
- "isCandidateAskingQuestion": true if the candidate's last message was them asking you a question
- "warningMessage": if isCandidateAskingQuestion is true, include a polite warning like "Remember, you're here to answer questions, not to interview me. Let's continue with your interview."
- "isInterviewComplete": true only when the interview should end (time up or natural conclusion)
- Generate unique questionId values like "q1", "q2", "q1-f1" for follow-ups`;
}

export function buildFeedbackSystemPrompt(
  config: { role: string; topic?: string; company?: string; difficulty?: string }
): string {
  const difficulty = config.difficulty ?? "moderate";
  return `You are an expert interview coach for HiredOrFired. Analyze the completed mock interview transcript and produce detailed feedback.

Interview context:
- Job role: ${config.role}
${config.topic ? `- Topic: ${config.topic}` : ""}
${config.company ? `- Target company: ${config.company}` : ""}
- Difficulty level: ${difficulty} (calibrate expectations accordingly — e.g. be more lenient for easy, more demanding for difficult)

Respond with valid JSON only, no markdown fences:
{
  "overallSummary": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "suggestedImprovements": ["actionable tip 1", "actionable tip 2", ...],
  "perQuestionFeedback": [
    {
      "questionId": "matching id from transcript or generated",
      "question": "the interview question",
      "candidateAnswer": "summary of candidate's answer",
      "feedback": "specific feedback on this answer",
      "sampleBetterAnswer": "an example of a stronger answer"
    }
  ]
}

Be constructive, specific, and actionable. Include at least 3 items in strengths, weaknesses, and suggestedImprovements when possible.`;
}

export function parseJSONResponse<T>(raw: string): T {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object found in LLM response");
  return JSON.parse(jsonMatch[0]) as T;
}
