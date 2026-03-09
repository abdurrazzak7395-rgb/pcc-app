# SVP Backend (Express + Prisma + Postgres)

## What it does
- Calls SVP login -> sends OTP
- Verifies OTP -> extracts SVP token from `access_payload.access`
- Creates your own access JWT + refresh cookie session
- Stores SVP access token encrypted in DB
- Exposes proxy endpoints under `/api/svp/*` (permissions, occupations, exams, booking, etc.)

## Setup
1) Copy env:
   - `cp .env.example .env`
2) Start Postgres:
   - `docker compose up -d`
3) Install + migrate:
   - `npm i`
   - `npx prisma generate`
   - `npx prisma migrate dev --name init`
4) Run:
   - `npm run dev`

Backend runs at: http://localhost:4000

## API
- POST /api/auth/login
- POST /api/auth/otp-verify
- POST /api/auth/refresh
- POST /api/auth/logout
- GET  /api/me

Proxy examples:
- GET /api/svp/permissions
- GET /api/svp/occupations
- GET /api/svp/exam-constraints
- GET /api/svp/available-dates?per_page=1000&category_id=56&start_at_date_from=2025-12-15&available_seats=greater_than::0&status=scheduled
- GET /api/svp/exam-sessions?category_id=56&city=Mymensingh&exam_date=2025-12-24
- POST /api/svp/temporary-seats   (body passes through)
- POST /api/svp/exam-reservations (body passes through)
