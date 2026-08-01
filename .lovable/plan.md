# AI Interview Practice Platform — Build Plan

## Goal
Transform the single-file AI Interviewer into a production-grade, full-stack interview practice platform for students preparing for campus placements. It will simulate real interviews with multiple rounds, scoring, feedback, and progress tracking.

## Tech Stack
- **Frontend:** TanStack Start (React 19, SSR/SSG, Vite 7)
- **Backend:** Lovable Cloud (auth, PostgreSQL, storage) + `createServerFn` for app logic
- **AI:** Lovable AI Gateway (chat, speech-to-text, text-to-speech)
- **Styling:** Tailwind CSS v4 + shadcn/ui design tokens
- **Real-time media:** Web Audio API for voice capture, WebRTC for camera

## Core Features

### 1. Authentication & Onboarding
- Student sign-up / sign-in with email or Google (Lovable Cloud auth)
- Profile: name, target role, branch/year, target companies, weak areas
- Onboarding skill assessment quiz to personalize interview difficulty

### 2. Interview Modes
- **Quick Practice:** One-round interview (behavioral or technical) on demand
- **Full Mock Interview:** Multi-round simulation:
  - Introduction / HR screening
  - Technical / DSA round (verbal explanation + optionally code-writing)
  - Resume/project round
  - HR/behavioral round
- **Company-Specific Mock:** Templates for common recruiters (TCS, Infosys, Wipro, Google, Amazon, etc.) with typical question styles
- **Custom Interview:** User selects round type, difficulty, duration, topic

### 3. Interview Experience
- Landing page for role/company/topic selection
- Interview room with AI interviewer avatar, chat transcript, voice/text input, and user camera
- AI-generated follow-up questions based on previous answers (not just static list)
- Resume upload / paste for resume-based questions
- Voice input (Lovable AI STT) and AI voice output (TTS)
- Camera preview, mute/camera toggle
- Live timer and stage indicator
- Stop/pause interview with session recovery

### 4. Evaluation & Feedback
- After each answer, AI scores on rubrics:
  - Technical accuracy
  - Communication clarity
  - Confidence/structure
  - Overall answer quality
- End-of-interview report card with:
  - Overall score and breakdown
  - Strengths and weaknesses
  - Suggested improvements
  - Sample ideal answer
- Transcript download and shareable report link

### 5. Progress & History
- Dashboard showing past interviews, scores, and improvement trends
- Topic-wise weak areas (e.g., "OOPs", "DBMS", "behavioral")
- Recommended practice sessions based on weak areas
- Streaks and practice goals

### 6. Content Management
- Pre-loaded question bank for common placement topics
- Topics: DSA, OOPs, DBMS, OS, Networking, System Design (basic), HR, Resume, Aptitude
- Difficulty levels: Easy, Medium, Hard
- Company-specific interview templates

## Database Schema (Lovable Cloud / Supabase)

### Tables
- `profiles` (extends auth.users): name, role, branch, year, target_role, weak_areas, created_at
- `interviews`: id, user_id, mode, title, status, role, company, difficulty, settings, started_at, ended_at, overall_score
- `interview_messages`: id, interview_id, role, content, stage, scores, created_at
- `interview_reports`: id, interview_id, overall_score, category_scores, strengths, weaknesses, summary, recommended_resources
- `question_bank`: id, topic, difficulty, question, expected_keywords, model_answer, company_tag, tags
- `user_progress`: id, user_id, topic, total_attempts, average_score, last_attempt_at
- `user_roles`: roles table (standard pattern) if admin dashboard is added later

## Routes
- `/` — Landing page with value prop and CTA
- `/auth` — Authentication (login/signup) via Lovable Cloud
- `/dashboard` — Student dashboard with history, stats, recommended practice
- `/interview/setup` — Interview configuration (mode, role, company, difficulty, topics)
- `/interview/[id]` — Live interview room
- `/interview/[id]/report` — Interview report card
- `/interview/[id]/transcript` — Full transcript view
- `/topics` — Browse topic-wise practice questions
- `/profile` — User profile and preferences
- `/api/public/*` — Webhook/public endpoints if needed

## AI Engine Design
- `createServerFn` handlers:
  - `startInterview` — create session, generate first question based on settings
  - `submitAnswer` — receive answer, score it, generate next adaptive question
  - `endInterview` — generate final report and summary
  - `transcribeAudio` — receive WAV blob, return streaming transcript via Lovable AI STT
  - `speakText` — generate AI voice TTS (optional, can use browser TTS as fallback)
- System prompts built for interviewer persona, evaluation rubric, and adaptive follow-ups
- Use structured output (Zod schema) for scores and report data

## Implementation Phases

### Phase 1 — Foundation
- Enable Lovable Cloud
- Set up design system and base layout
- Authentication pages and protected routes (`_authenticated` layout)
- Profile and onboarding

### Phase 2 — Interview Core
- Interview setup flow
- Live interview room with chat, voice, camera
- Backend AI engine for start/submit/end interview
- Resume upload and parsing prompt
- Basic scoring and transcript

### Phase 3 — Reports & Dashboard
- Interview report card
- Dashboard with history, charts, trends
- Topic-wise progress tracking
- Recommendations based on weak areas

### Phase 4 — Polish & Scale
- Company-specific templates
- Full mock interview multi-round flow
- TTS for AI voice
- Mobile responsive layout
- SEO, meta tags, social sharing

## Out-of-Scope (Future)
- Live human interviewer connection
- Code editor with compilation (can add later as a separate "coding round" feature)
- Paid subscription / credits (can be added later)
- Recruiter/admin panel (can be added later)

## Notes
- This is a full-stack app with AI voice/video; it will use the browser's camera and microphone with permission.
- AI calls stay server-side via Lovable AI Gateway; `LOVABLE_API_KEY` never reaches the client.
- I will use the existing dark/interview aesthetic from the uploaded HTML as the starting visual direction but refine it into a full design system.