GYMERS — AI Gym Application
A modern gym management and fitness tracking web app with AI-powered coaching, real-time form analysis, and gamification. Built for gym members and owners.

Next.js React TypeScript Supabase

Features
For Members
Dashboard — Workout stats, streak tracking, weekly volume charts, and recent activity
Workout Logging — Log sessions with exercises, sets, reps, and weight
AI Coach — Rule-based workout suggestions based on your history, muscle-group balance, and progressive overload
Form Check — Upload or record video; MediaPipe pose detection analyzes squat, bench, deadlift, overhead press, and pull-ups with rep counting and form tips
Records — Track personal bests
Rewards — Earn trophies and stay motivated with streaks
For Owners
Owner Portal — Gym management dashboard (member/owner/admin roles)
Tech Stack
Layer	Technology
Framework
Next.js 16 (App Router, Turbopack)
UI
React 19, Tailwind CSS 4, shadcn/ui, Framer Motion
Backend
Supabase (Auth, PostgreSQL, RLS)
AI / Vision
MediaPipe Tasks Vision (pose estimation)
Charts
Recharts
Getting Started
Prerequisites
Node.js 20+
npm
A Supabase project
1. Clone the repo
git clone https://github.com/adityao3o8/AI-Gym-application.git
cd AI-Gym-application
2. Install dependencies
npm install
3. Environment variables
Copy the example env file and fill in your Supabase credentials:

cp .env.example .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
Get these from Supabase Dashboard → Project Settings → API.

4. Database setup
Apply the initial schema using one of these options:

Option A — Supabase CLI

supabase db push
Option B — SQL Editor
Paste the contents of supabase/migrations/20250521000000_initial_schema.sql into the Supabase Dashboard SQL Editor and run it.

5. Run the dev server
npm run dev
Open http://localhost:3000 in your browser.

Scripts
Command	Description
npm run dev
Start development server
npm run build
Production build
npm run start
Start production server
npm run lint
Run ESLint
Project Structure
src/
├── app/
│   ├── (auth)/          # Login & signup
│   ├── (shell)/         # Authenticated app routes
│   │   ├── dashboard/
│   │   ├── workouts/
│   │   ├── coach/       # AI coach + form check
│   │   ├── records/
│   │   ├── rewards/
│   │   └── owner/
│   └── actions/         # Server actions
├── components/          # UI, layout, charts
├── lib/                 # AI coach, form analyzer, gamification, Supabase
├── services/            # Auth & user services
└── types/               # TypeScript types & DB schema types
supabase/
└── migrations/          # Database migrations
Database Schema
gyms — Gym profiles with owner linkage
users — Member profiles (linked to Supabase Auth), roles, streaks
workouts / workout_entries — Session logging
attendance — Check-in tracking
trophies / user_trophies — Gamification rewards
Roles: member, owner, admin

Deployment
Deploy to Vercel or any Node.js host:

Push to GitHub
Import the repo in Vercel
Add the same environment variables from .env.local
Deploy
License
Private — all rights reserved.
