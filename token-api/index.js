import express from 'express';
import cors from 'cors';
import { AccessToken } from '@livekit/server-sdk';
import { randomUUID } from 'node:crypto';

const app = express();
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(cors({ origin: (origin, callback) => {
  if (!origin || !allowedOrigin || origin === allowedOrigin) return callback(null, Boolean(!allowedOrigin || origin === allowedOrigin));
  return callback(new Error('Origin is not allowed'));
} }));
app.use(express.json({ limit: '10kb' }));
const requestCounts = new Map();
app.use('/token', (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const entry = requestCounts.get(ip) || { since: now, count: 0 };
  if (now - entry.since > 60_000) { entry.since = now; entry.count = 0; }
  entry.count++;
  requestCounts.set(ip, entry);
  if (entry.count > 30) return res.status(429).json({ error: 'Too many token requests' });
  next();
});
app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/token', async (req, res) => {
  const { room, role } = req.body || {};
  if (typeof room !== 'string' || !/^[\w-]{1,80}$/.test(room) || !['publisher', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid room or role' });
  }
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) return res.status(503).json({ error: 'LiveKit credentials are not configured' });
  try {
    const identity = `${role}-${randomUUID()}`;
    const token = new AccessToken(apiKey, apiSecret, { identity, ttl: '15m' });
    token.addGrant({ roomJoin: true, room, canPublish: role === 'publisher', canSubscribe: role === 'viewer' });
    res.json({ token: await token.toJwt() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not create access token' });
  }
});
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`PhoneCam token API listening on ${port}`));
