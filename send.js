const crypto = require('crypto');
const webpush = require('web-push');
const { redis, KEY } = require('./_lib');

const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const authorized = req => {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return false;
  return crypto.timingSafeEqual(sha(req.headers['x-admin-key'] || ''), sha(expected));
};

module.exports = async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'Admin key salah' });

  if (req.method === 'GET') {
    return res.status(200).json({ count: await redis.hlen(KEY) });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, body, url } = req.body || {};
  if (!title || !body || String(title).length > 60 || String(body).length > 200) {
    return res.status(400).json({ error: 'Judul (maks 60) dan pesan (maks 200) wajib diisi' });
  }
  if (url && !/^https?:\/\//.test(url)) return res.status(400).json({ error: 'Link harus diawali http(s)://' });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({ title: String(title), body: String(body), url: url || '/' });

  const subs = Object.values((await redis.hgetall(KEY)) || {});
  let sent = 0, failed = 0, removed = 0;

  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification(sub, payload, { TTL: 86400 });
      sent++;
    } catch (err) {
      failed++;
      // 404/410 = subscription sudah tidak berlaku (app di-uninstall / izin dicabut)
      if (err.statusCode === 404 || err.statusCode === 410) {
        await redis.hdel(KEY, sub.endpoint);
        removed++;
      }
    }
  }));

  return res.status(200).json({ sent, failed, removed });
};
