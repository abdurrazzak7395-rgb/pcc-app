import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { decryptString } from '../lib/crypto.js';
import { requireAuth } from '../lib/authMiddleware.js';
import { svpRequest } from '../lib/svpClient.js';

const router = Router();

async function getSvpTokenFromSession(req){
  const sid = req.user?.sid;
  if (!sid) return null;
  const session = await prisma.session.findUnique({ where: { id: String(sid) } });
  if (!session?.svpAccessEnc) return null;
  return decryptString(session.svpAccessEnc);
}

router.get('/permissions', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    if (!token) return res.status(401).json({ message: 'No SVP token in session' });
    const data = await svpRequest('/api/v1/individual_labor_space/permissions', { token });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/occupations', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const qp = new URLSearchParams(req.query).toString();
    const path = `/api/v1/individual_labor_space/occupations${qp ? `?${qp}` : ''}`;
    const data = await svpRequest(path, { token });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/exam-constraints', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const data = await svpRequest('/api/v1/individual_labor_space/exam_constraints', { token });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/available-dates', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    // Pass through common query params: category_id, start_at_date_from, etc.
    const qp = new URLSearchParams(req.query).toString();
    const path = `/api/v1/individual_labor_space/exam_sessions/available_dates${qp ? `?${qp}` : ''}`;
    const data = await svpRequest(path, { token });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/exam-sessions', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const qp = new URLSearchParams(req.query).toString();
    const path = `/api/v1/individual_labor_space/exam_sessions${qp ? `?${qp}` : ''}`;
    const data = await svpRequest(path, { token });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/exam-session/:id', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const data = await svpRequest(`/api/v1/individual_labor_space/exam_sessions/${encodeURIComponent(req.params.id)}`, { token });
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/temporary-seats', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const data = await svpRequest('/api/v1/individual_labor_space/temporary_seats', { method:'POST', token, body: req.body });
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/exam-reservations', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const data = await svpRequest('/api/v1/individual_labor_space/exam_reservations', { method:'POST', token, body: req.body });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/certificate-price', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const data = await svpRequest('/api/v1/individual_labor_space/certificate_price', { token });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/payments-validate-pending', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const data = await svpRequest('/api/v1/individual_labor_space/payments/validate_pending', { token });
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/payments', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const data = await svpRequest('/api/v1/individual_labor_space/payments', { method: 'POST', token, body: req.body });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/payments/:id', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const paymentId = encodeURIComponent(req.params.id);
    const qp = new URLSearchParams(req.query).toString();
    const path = `/api/v1/individual_labor_space/payments/${paymentId}${qp ? `?${qp}` : ''}`;
    const data = await svpRequest(path, { token });
    res.json(data);
  } catch (e) { next(e); }
});

router.put('/payments/:id', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const paymentId = encodeURIComponent(req.params.id);
    const qp = new URLSearchParams(req.query).toString();
    const path = `/api/v1/individual_labor_space/payments/${paymentId}${qp ? `?${qp}` : ''}`;
    const data = await svpRequest(path, { method: 'PUT', token, body: req.body });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/feature-flags', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const data = await svpRequest('/api/v1/flipper/feature_flags', { token });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const qp = new URLSearchParams(req.query).toString();
    const path = `/api/v1/individual_labor_space/notifications${qp ? `?${qp}` : ''}`;
    const data = await svpRequest(path, { token });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/user-balance/:svpUserId', requireAuth, async (req, res, next) => {
  try {
    const token = await getSvpTokenFromSession(req);
    const svpUserId = req.params.svpUserId;
    const qp = new URLSearchParams(req.query).toString();
    const path = `/api/v1/users/${encodeURIComponent(svpUserId)}/balance${qp ? `?${qp}` : ''}`;
    const data = await svpRequest(path, { token });
    res.json(data);
  } catch (e) { next(e); }
});

export const svpRouter = router;
