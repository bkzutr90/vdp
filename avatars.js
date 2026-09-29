// Vercel Serverless Function: mengambil foto avatar Roblox dari sisi server
// (browser tidak bisa langsung karena diblokir CORS / hotlink oleh Roblox).
module.exports = async (req, res) => {
  const ids = String(req.query.ids || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => /^\d+$/.test(s))
    .slice(0, 50);

  if (!ids.length) {
    res.status(400).json({ data: [] });
    return;
  }

  try {
    const url = 'https://thumbnails.roblox.com/v1/users/avatar?userIds=' + ids.join(',') +
      '&size=420x420&format=Png&isCircular=false';
    const r = await fetch(url);
    const json = await r.json();
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(json);
  } catch (e) {
    res.status(502).json({ data: [] });
  }
};
