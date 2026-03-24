# Bowling Green Bible Drill — Next.js

Interactive Bible quiz game with **1,270 questions** across 17 Bible periods, plus Geography and Prophets bonus sections.

## Getting Started

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production
```bash
npm run build
npm start
```

## Deploy to Vercel (recommended)

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Vercel auto-detects Next.js — click **Deploy**

No environment variables required for basic use.

## AI Distractors (Optional)

The Multiple Choice mode can generate AI-powered wrong answer options using the Anthropic API. To enable this, the app currently requires an API key to be set inside the component. For production, you can expose it via an environment variable and a Next.js API route:

1. Create `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

2. Create `app/api/distractors/route.js` as a proxy that reads `process.env.ANTHROPIC_API_KEY` and forwards requests to Anthropic.

## Project Structure

```
bible-drill-nextjs/
├── app/
│   ├── layout.js          # Root layout (loads Google Fonts, sets metadata)
│   └── page.js            # Home page — renders <BibleDrill />
├── components/
│   └── BibleDrill.jsx     # Main game component ("use client")
├── lib/
│   └── questions.json     # All 1,270 questions (extracted from RAW_DATA)
├── public/                # Static assets
├── next.config.js
└── package.json
```

## Game Modes

- **Multiple Choice** — 4 options with AI-generated distractors
- **Free Response** — Type the answer
- **Speed Drill** — 7-second countdown per question
- **Study Mode** — Tap-to-flip flashcards by period
- **Jeopardy** — 17 periods × 5 point values
- **Review Missed** — Retry questions you got wrong

## Question Sections

| Section | Questions |
|---------|-----------|
| 17 Bible Periods (A/B/C + WSR/NTP/NTB/CH) | 1,059 |
| Geography A–C | 91 |
| Prophets A–C | 120 |
| **Total** | **1,270** |
