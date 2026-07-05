# HiredOrFired

AI-powered mock interview web app. Practice job interviews with voice and text, get smart follow-ups, and receive detailed feedback — all at zero infrastructure cost.

## Features

- **Role-focused interviews** — Technical + behavioral questions tailored to your job role, topic, and target company
- **Voice + text answers** — Speak your answers (default) or type them
- **Smart follow-ups** — AI asks up to 2 dynamic follow-ups per question
- **Time-based sessions** — Choose 5–30 minute interview durations
- **Detailed feedback** — Per-question feedback, strengths, weaknesses, improvements, and sample better answers
- **Local-only storage** — All data stays in your browser via IndexedDB
- **Zero cost** — Browser speech APIs + free-tier Gemini/Groq LLM APIs

## Tech Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Browser SpeechRecognition + SpeechSynthesis APIs
- Google Gemini API (primary) with Groq Llama fallback
- IndexedDB via Dexie

## Getting Started

### Prerequisites

- Node.js 18+
- Chrome or Edge (recommended for speech recognition)
- Free API keys from [Google AI Studio](https://aistudio.google.com/apikey) and [Groq Console](https://console.groq.com/)

### Setup

```bash
npm install
cp .env.example .env.local
# Add your GEMINI_API_KEY and GROQ_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GROQ_API_KEY` | Yes | Groq API key (fallback) |
| `GEMINI_MODEL` | No | Default: `gemini-2.5-flash` |
| `GROQ_MODEL` | No | Default: `llama-3.3-70b-versatile` |

## Pages

- **Home** — Set up and start an interview
- **Interview** — Live voice/text interview session
- **Feedback** — Detailed post-interview report
- **History** — Browse past sessions
- **Settings** — Voice preferences and defaults

## Privacy

All user data is stored locally in IndexedDB. The only external requests are to the LLM APIs for generating interview questions and feedback. No backend database, no user accounts, no analytics.
