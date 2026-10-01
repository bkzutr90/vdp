const crypto = require('crypto');
const webpush = require('web-push');
const { redis, KEY } = require('./_lib');

const sha = (s) =>
  crypto.createHash('sha256').update(String(s)).digest();

const authorized = (req) => {
  const expected = process.env.ADMIN_KEY;

  if (!expected) return false;

  return crypto.timingSafeEqual(
    sha(req.headers['x-admin-key'] || ''),
    sha(expected)
  );
};

module.exports = async (req, res) => {
  try {
    // =========================
    // AUTH
    // =========================
    if (!authorized(req)) {
      return res.status(401).json({
        error: 'Admin key salah'
      });
    }

    // =========================
    // GET
    // =========================
    if (req.method === 'GET') {
      const count = await redis.hlen(KEY);

      return res.status(200).json({
        count
      });
    }

    // =========================
    // METHOD
    // =========================
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    // =========================
    // BODY
    // =========================
    const { title, body, url } = req.body || {};

    if (
      !title ||
      !body ||
      String(title).length > 60 ||
      String(body).length > 200
    ) {
      return res.status(400).json({
        error: 'Judul (maks 60) dan pesan (maks 200) wajib diisi'
      });
    }

    if (
      url &&
      !/^https?:\/\//i.test(String(url))
    ) {
      return res.status(400).json({
        error: 'Link harus diawali http(s)://'
      });
    }

    // =========================
    // CHECK VAPID
    // =========================
    const vapidSubject = process.env.VAPID_SUBJECT;
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (
      !vapidSubject ||
      !vapidPublicKey ||
      !vapidPrivateKey
    ) {
      console.error('VAPID environment variable belum lengkap');

      return res.status(500).json({
        error: 'Konfigurasi VAPID belum lengkap'
      });
    }

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    // =========================
    // PAYLOAD
    // =========================
    const payload = JSON.stringify({
      title: String(title),
      body: String(body),
      url: url ? String(url) : '/'
    });

    // =========================
    // GET SUBSCRIPTIONS
    // =========================
    const rawSubs = await redis.hgetall(KEY);

    const subs = Object.entries(rawSubs || {})
      .map(([endpoint, value]) => {
        try {
          // Kalau value disimpan sebagai JSON string
          const subscription =
            typeof value === 'string'
              ? JSON.parse(value)
              : value;

          if (
            !subscription ||
            !subscription.endpoint
          ) {
            console.error(
              'Subscription tidak valid:',
              endpoint
            );

            return null;
          }

          return {
            redisKey: endpoint,
            subscription
          };
        } catch (err) {
          console.error(
            'Gagal parse subscription:',
            endpoint,
            err.message
          );

          return null;
        }
      })
      .filter(Boolean);

    let sent = 0;
    let failed = 0;
    let removed = 0;

    // =========================
    // SEND NOTIFICATION
    // =========================
    await Promise.all(
      subs.map(async ({ redisKey, subscription }) => {
        try {
          await webpush.sendNotification(
            subscription,
            payload,
            {
              TTL: 86400
            }
          );

          sent++;
        } catch (err) {
          failed++;

          console.error(
            'Push notification gagal:',
            subscription.endpoint,
            err.statusCode || '',
            err.message || err
          );

          // Subscription sudah tidak berlaku
          if (
            err.statusCode === 404 ||
            err.statusCode === 410
          ) {
            try {
              await redis.hdel(KEY, redisKey);
              removed++;
            } catch (deleteErr) {
              console.error(
                'Gagal menghapus subscription:',
                deleteErr.message
              );
            }
          }
        }
      })
    );

    // =========================
    // RESPONSE
    // =========================
    return res.status(200).json({
      success: true,
      sent,
      failed,
      removed,
      total: subs.length
    });

  } catch (err) {
    console.error('API /api/send error:', err);

    return res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
};
