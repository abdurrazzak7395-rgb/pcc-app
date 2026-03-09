# SVP Fullstack (Next.js + Express + Postgres)

This project uses the SVP API login + OTP flow, then issues your own access JWT + refresh cookie session,
and proxies SVP endpoints through your backend.

## Requirements
- Node.js 18+ (recommended Node 20)
- Docker (for Postgres)

## Start backend
```bash
cd backend
cp .env.example .env
docker compose up -d
npm i
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## Start frontend
```bash
cd ../frontend
cp .env.example .env.local
npm i
npm run dev
```

Go to: http://localhost:3000/auth/login

## Notes
- SVP access token is extracted from `access_payload.access` (from your Postman response).
- Do NOT commit real SVP credentials/tokens.


## Exam UI
- Open: http://localhost:3000/exam/booking


## Booking Modal UI
- Open Dashboard and click **Create New Booking** to use the modal UI similar to your screenshot.
