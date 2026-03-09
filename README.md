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

## Public Repo And Fork Use
- This repository is prepared for public fork usage.
- Public runtime keys in `frontend/public/config.json` are placeholders. Set your own values before deployment.
- Do not commit private `.env` files (`backend/.env`, `frontend/.env.local`).

### Make GitHub Repo Public
1. Open repo settings: `https://github.com/abdurrazzak7395-rgb/pcc-app/settings`
2. Go to **General** -> **Danger Zone**.
3. Click **Change repository visibility** -> **Make public**.
4. Confirm repository name.

### Fork
1. Open `https://github.com/abdurrazzak7395-rgb/pcc-app`
2. Click **Fork** (top-right).
3. Choose your account/org and create fork.
