const { redis, KEY } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sub = req.body;
  const ok = sub
    && typeof sub.endpoint === 'string'
    && sub.endpoint.startsWith('https://')
    && sub.endpoint.length < 1000
    && sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string';
  if (!ok) return res.status(400).json({ error: 'Subscription tidak valid' });

  try {
    await redis.hset(KEY, {
      [sub.endpoint]: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }
    });
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal menyimpan' });
  }
};
