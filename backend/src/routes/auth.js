import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { encryptString } from '../lib/crypto.js';
import { randomToken } from '../lib/crypto.js';
import { signAccess } from '../lib/jwt.js';
import { svpRequest } from '../lib/svpClient.js';

const router = Router();

const LoginSchema = z.object({
  login: z.string().min(3),
  password: z.string().min(3),
  otpMethod: z.enum(['email','sms']).default('email'),
});

const OtpSchema = z.object({
  login: z.string().min(3),
  password: z.string().min(3),
  otpAttempt: z.string().min(4).max(10),
  otpMethod: z.enum(['email','sms']).default('email'),
});

router.post('/login', async (req, res, next) => {
  try {
    const { login, password, otpMethod } = LoginSchema.parse(req.body);
    const feApp = process.env.SVP_FE_APP || 'legislator';

    // trigger OTP email/sms
    await svpRequest('/api/v1/sessions/login', {
      method: 'POST',
      body: { user: { login, password, otp_method: otpMethod, fe_app: feApp } }
    });

    res.json({ status: 'OTP_SENT' });
  } catch (e) { next(e); }
});

router.post('/otp-verify', async (req, res, next) => {
  try {
    const { login, password, otpAttempt, otpMethod } = OtpSchema.parse(req.body);
    const feApp = process.env.SVP_FE_APP || 'legislator';

    const data = await svpRequest('/api/v1/sessions/otp', {
      method: 'POST',
      body: { user: { login, password, otp_attempt: otpAttempt, fe_app: feApp, otp_method: otpMethod } }
    });

    // Token is: access_payload.access (confirmed in the uploaded Postman response)
    const svpToken = data?.access_payload?.access;
    const svpExp = data?.access_payload?.access_expires_at ? new Date(data.access_payload.access_expires_at) : null;

    if (!svpToken) {
      const err = new Error('SVP token not found at access_payload.access');
      err.statusCode = 500;
      err.details = data;
      throw err;
    }

    const svpUserId = data?.user?.id ?? null;
    const email = data?.user?.email ?? null;
    const fullName = data?.user?.full_name ?? null;

    const user = await prisma.user.upsert({
      where: { login },
      update: { svpUserId, email, fullName },
      create: { login, svpUserId, email, fullName },
    });

    // Create refresh token (opaque) stored hashed, set in HttpOnly cookie
    const refreshRaw = randomToken(32);
    const refreshHash = await bcrypt.hash(refreshRaw, 10);
    const refreshDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14);
    const refreshExpiresAt = new Date(Date.now() + refreshDays * 24*60*60*1000);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshHash,
        refreshExpiresAt,
        svpAccessEnc: encryptString(svpToken),
        svpAccessExp: svpExp,
      }
    });

    // Your access JWT for your app
    const accessToken = signAccess({ sub: user.id, login: user.login, sid: session.id });

    // Cookies (refresh token + session id)
    const secure = String(process.env.COOKIE_SECURE) === 'true';
    const sameSite = (process.env.COOKIE_SAMESITE || 'lax');

    res.cookie('svp_rt', refreshRaw, {
      httpOnly: true, secure, sameSite,
      path: '/api/auth/refresh',
      maxAge: refreshDays * 24*60*60*1000,
    });
    res.cookie('svp_sid', session.id, {
      httpOnly: true, secure, sameSite,
      path: '/api/auth/refresh',
      maxAge: refreshDays * 24*60*60*1000,
    });

    res.json({ accessToken, user: { id: user.id, login: user.login, svpUserId, email, fullName } });
  } catch (e) { next(e); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const sid = req.cookies?.svp_sid;
    const rt = req.cookies?.svp_rt;
    if (!sid || !rt) return res.status(401).json({ message: 'Missing refresh cookies' });

    const session = await prisma.session.findUnique({ where: { id: String(sid) }, include: { user: true } });
    if (!session || session.revokedAt) return res.status(401).json({ message: 'Session revoked' });
    if (session.refreshExpiresAt.getTime() < Date.now()) return res.status(401).json({ message: 'Refresh expired' });

    const ok = await bcrypt.compare(String(rt), session.refreshTokenHash);
    if (!ok) return res.status(401).json({ message: 'Invalid refresh token' });

    const accessToken = signAccess({ sub: session.user.id, login: session.user.login, sid: session.id });
    res.json({ accessToken });
  } catch (e) { next(e); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const sid = req.cookies?.svp_sid;
    if (sid) {
      await prisma.session.update({ where: { id: String(sid) }, data: { revokedAt: new Date() } }).catch(()=>{});
    }
    res.clearCookie('svp_rt', { path: '/api/auth/refresh' });
    res.clearCookie('svp_sid', { path: '/api/auth/refresh' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export const authRouter = router;
