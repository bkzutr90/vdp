// /api/announcements
// GET            -> publik: daftar pengumuman aktif
// GET (admin)    -> kirim header x-admin-key + ?all=1 untuk semua (termasuk kadaluarsa)
// PUT (admin)    -> simpan seluruh daftar: { items: [...] }
//
// Env yang dibutuhkan:
//   ADMIN_KEY  (samakan dengan yang dipakai /api/send)
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN  (atau KV_REST_API_URL + KV_REST_API_TOKEN)
const crypto = require('crypto');

const KEY = 'announcements';
const TYPES = ['info', 'penting', 'event'];

async function redis(cmd) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Database belum dikonfigurasi');
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || 'Database error');
  return j.result;
}

async function load() {
  const raw = await redis(['GET', KEY]);
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}

function isAdmin(req) {
  const given = String(req.headers['x-admin-key'] || '');
  const real = String(process.env.ADMIN_KEY || '');
  if (!given || !real) return false;
  const h = s => crypto.createHash('sha256').update(s).digest();
  return crypto.timingSafeEqual(h(given), h(real));
}

const okDate = s => /^\d{4}-\d{2}-\d{2}/.test(s) && !isNaN(new Date(s));

function clean(items) {
  return items.slice(0, 20).map(it => {
    const url = String(it.url || '').trim().slice(0, 300);
    return {
      id: String(it.id || crypto.randomUUID()).slice(0, 40),
      title: String(it.title || '').trim().slice(0, 80),
      body: String(it.body || '').trim().slice(0, 400),
      type: TYPES.includes(it.type) ? it.type : 'info',
      url: /^(https?:\/\/|\/)/.test(url) ? url : '',
      pinned: !!it.pinned,
      date: okDate(String(it.date || '')) ? new Date(it.date).toISOString() : new Date().toISOString(),
      expires: okDate(String(it.expires || '')) ? String(it.expires).slice(0, 10) : ''
    };
  }).filter(it => it.title);
}

const sortItems = a => a.sort((x, y) => (y.pinned - x.pinned) || (new Date(y.date) - new Date(x.date)));
const active = it => !it.expires || new Date(it.expires + 'T23:59:59') >= new Date();

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const items = await load();
      if (req.query.all && isAdmin(req)) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ items: sortItems(items) });
      }
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
      return res.status(200).json({ items: sortItems(items.filter(active)) });
    }
    if (req.method === 'PUT') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Admin key salah' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || !Array.isArray(body.items)) return res.status(400).json({ error: 'Format salah' });
      const items = clean(body.items);
      await redis(['SET', KEY, JSON.stringify(items)]);
      return res.status(200).json({ ok: true, count: items.length });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
