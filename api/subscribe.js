const { redis, KEY } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const sub = req.body;

    const ok =
      sub &&
      typeof sub.endpoint === 'string' &&
      sub.endpoint.startsWith('https://') &&
      sub.endpoint.length < 1000 &&
      sub.keys &&
      typeof sub.keys.p256dh === 'string' &&
      typeof sub.keys.auth === 'string';

    if (!ok) {
      return res.status(400).json({
        error: 'Subscription tidak valid'
      });
    }

    const subscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth
      }
    };

    await redis.hset(KEY, {
      [sub.endpoint]: subscription
    });

    console.log('Push subscription tersimpan:', sub.endpoint);

    const count = await redis.hlen(KEY);

    return res.status(201).json({
      ok: true,
      count
    });

  } catch (err) {
    console.error('API /api/subscribe error:', err);

    return res.status(500).json({
      error: 'Gagal menyimpan',
      message: err.message
    });
  }
};
