# Sakido

A student productivity app built with React, Vite, TypeScript, and Supabase. Combines scheduling, tasks, notes, flashcards, a focus timer, habits, and Google integrations in one dashboard.

---

## Tech Stack

- **Frontend** — React 19, TypeScript, Tailwind CSS v4, Vite
- **Auth & DB** — Supabase (Postgres + Auth)
- **Google integrations** — Google Calendar, Google Drive, Gmail (OAuth via Supabase)
- **Deployment** — Vercel

---

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd sakido
npm install
```

> If you see both `bun.lock` and `package-lock.json`, pick one package manager and delete the other lockfile.

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Project Settings → API |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → APIs & Services → Credentials |
| `ALLOWED_ORIGIN` | Your deployed URL (e.g. `https://sakidoapp.vercel.app`) |

### 3. Run locally

```bash
npm run dev
```

The dev server runs via `tsx server.ts`, which boots Express with Vite as middleware. HMR is enabled by default.

### 4. Build for production

```bash
npm run build
npm start
```

---

## Project Structure

```
src/
  components/
    dashboard/SakidoDashboard.tsx   # Main dashboard (all tabs)
    auth/AuthModal.tsx              # Login / sign-up modal
    flashcards/FlashcardModule.tsx  # Flashcard study module
    command/CommandPalette.tsx      # Cmd+K command palette
    common/SakidoLogo.tsx
  lib/
    supabaseClient.ts               # Browser Supabase client
    supabaseServer.ts               # Server-side Supabase client
  hooks/
    useLocalStorageState.ts
  types/index.ts
api/
  refresh-token.js                  # Vercel serverless — Google OAuth token refresh
supabase/
  schema.sql                        # Database schema
```

---

## Google OAuth Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Calendar API, Drive API, and Gmail API
3. Create OAuth 2.0 credentials (Web application)
4. Add your Supabase callback URL as an authorized redirect URI:
   `https://<your-project>.supabase.co/auth/v1/callback`
5. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to your `.env` and Vercel environment variables

---

## Deployment (Vercel)

```bash
vercel deploy
```

Set all environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**. The `api/refresh-token.js` file is automatically picked up as a Vercel Serverless Function.

---

## Database

Run `supabase/schema.sql` against your Supabase project to set up the initial schema:

```bash
psql <your-connection-string> < supabase/schema.sql
```

Or paste it directly into the Supabase SQL editor.
