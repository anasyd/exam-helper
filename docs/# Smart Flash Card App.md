# Smart Flash Card App

An intelligent study companion that revolutionizes the way students learn and retain information.

## Features

- **AI-Powered Content Generation**: Leverages Google's Gemini AI to extract and summarize key concepts from study materials
- **Spaced Repetition Algorithm**: Implements scientifically-proven spaced repetition techniques to enhance learning efficiency and long-term retention
- **Adaptive Learning**: Personalizes study sessions based on individual performance and learning patterns
- **Responsive Design**: Built with Tailwind CSS for optimal user experience across all devices
- **Cloud Deployment**: Deployed on Vercel for reliable, scalable access

## Technology Stack

The application combines modern web technologies with cutting-edge AI capabilities:

- **Frontend**: Next.js with Tailwind CSS for responsive, modern UI
- **AI Integration**: Google Gemini AI for intelligent content processing
- **Learning Algorithm**: Custom spaced repetition implementation
- **Deployment**: Vercel for seamless cloud hosting

## Impact

This tool addresses the critical need for effective study methods in modern education, helping students:
- Improve retention rates through scientifically-backed learning techniques
- Save time with AI-generated study materials
- Track progress and optimize study sessions
- Access learning tools from anywhere with cloud-based deployment


# Exam Helper

An AI-powered study platform that turns your documents and videos into interactive
flashcards, structured study guides, and intelligent quizzes — so you can study
smarter, not longer.

## What It Does

Upload a PDF, Word doc, or video transcript and Exam Helper uses large language
models to extract the key concepts and generate everything you need to ace your
exam. No copy-pasting, no manual card creation. Just upload and study.

The app runs entirely in the browser. Your documents never leave your device, your
API keys are stored locally, and there's no backend to sign up for.

## Features

### Document & Video Ingestion
- Upload PDFs, DOCX, and plain text files with client-side parsing (no server upload)
- Extract and process video transcripts from MP4, WebM, MOV, and OGV files
- Combine multiple documents into a single study project
- Content hash tracking prevents regenerating flashcards from the same source

### AI-Powered Generation
- **Flashcards** — structured Q&A cards with four multiple-choice options, a correct
  answer index, and a difficulty score (1–5). Generate 5–100 cards per session with
  duplicate detection built in.
- **Study Guides** — hierarchical outlines (title → sections → topics) that organize
  your material and anchor topic-specific quizzes.
- **Automated Notes** — GitHub-flavored markdown notes with headings, tables, and
  key definitions, generated directly from your documents or transcripts.
- **Summaries** — concise concept summaries for quick review before a session.

### Spaced Repetition Study Sessions
Cards are surfaced using a priority algorithm:
1. Cards you've never seen come first
2. Within unseen cards, higher difficulty is prioritized
3. Seen cards are ordered oldest-first
4. Answering correctly reduces difficulty by 1; incorrect increases it by 1

This means the more you use it, the smarter the deck gets.

### Topic Quiz System
Study guides unlock a structured quiz mode. Each section and topic gets its own
quiz, with MCQs generated on demand. Completing topics earns XP; completing a full
section gives a bonus reward.

### Gamification (Optional)
- Daily study streaks with milestone notifications
- XP earned per topic and section completion
- Can be toggled off entirely if it's not your thing

### Multi-Provider AI
Configure your preferred LLM provider and model. Supported providers:
- Google Gemini
- OpenAI
- Anthropic (Claude)
- OpenRouter (access to 100+ models via one API key)

Each generation feature (flashcards, study guides, notes, transcripts) routes to the
most capable available model — favouring structured output support for card generation
and long context windows for notes. You can override the model per feature in settings.

### Project Management
Organise your studying into projects — one per subject, course, or exam. Projects
persist in localStorage with full state (flashcards, notes, study guide, XP, session
history). Import and export projects as JSON. Share a project via a time-limited link
(30 days).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 + React 19 + TypeScript |
| UI | ShadCN UI, Tailwind CSS v4, Radix UI |
| State | Zustand 5 with localStorage persistence |
| AI | Gemini, OpenAI, Anthropic, OpenRouter SDKs |
| Documents | pdfjs-dist, pdf-parse, mammoth (DOCX) |
| Validation | Zod 4 + React Hook Form |
| Markdown | react-markdown + remark-gfm + rehype-raw |

## Architecture Highlights

**No backend required.** Document extraction (PDF, DOCX) runs in the browser via
WebAssembly and JavaScript parsers. AI calls go directly from the client to the
provider's API. The only server is Next.js serving static assets.

**Provider-agnostic AI layer.** Each AI provider implements a common interface.
A router resolves which model to call based on the feature's capability requirements
(structured output, long context, vision) and the user's configured credentials.
Adding a new provider is a single file.

**Schema-validated generation.** Flashcard and study guide generation uses structured
JSON output — the AI response is validated against a Zod schema before it's written
to state. Malformed responses are caught and retried rather than silently corrupting
your deck.

**Versioned state migrations.** The Zustand store ships with a migration layer (v1 →
v2 → v3) so stored data upgrades automatically when the schema changes. No data loss
between releases.

## Why I Built It

I built this to solve a real problem I had during exam season: turning 200-page lecture
notes into something I could actually study from took hours of manual work. Existing
flashcard apps required you to write every card by hand. I wanted to close that gap —
upload the document, let the AI do the extraction, and get straight to studying.

The multi-provider architecture came from not wanting to be locked into one API. Gemini
for free-tier experimentation, Claude for quality, OpenRouter for flexibility.
