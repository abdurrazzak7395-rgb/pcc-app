# SVP Frontend (Next.js)

## Setup
1) `cp .env.example .env.local`
2) `npm i`
3) `npm run dev`

Open: http://localhost:3000


## Token behavior
- After OTP verify, access token is saved to localStorage automatically.
- Refresh token is HttpOnly cookie; client auto-refreshes on 401.
