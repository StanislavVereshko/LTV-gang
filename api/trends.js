const https = require('https');
const zlib  = require('zlib');

const TIER_COUNTRIES = new Set([
  'US','GB','CA','AU','NZ','IE',
  'DE','FR','NL','SE','NO','CH','AT','BE','DK','FI',
  'ES','IT','PT','PL','CZ','SK','HU','RO',
  'JP','KR','SG','HK','TW',
  'AE','IL','SA',
  'BR','MX','AR','CL','CO','ZA',
]);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function get(url, extra = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.get({
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip',
        'Referer': 'https://trends.google.com/',
        ...extra,
      },
    }, (res) => {
      const chunks = [];
      const stream = res.headers['content-encoding'] === 'gzip'
        ? res.pipe(zlib.createGunzip()) : res;
      stream.on('data', c => chunks.push(c));
      stream.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
      stream.on('error', reject);
    });
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function parseGT(body) {
  return JSON.parse(body.replace(/^\)\]\}',?\n/, ''));
}

function findWidgets(parsed) {
  if (!parsed) return null;
  if (parsed.default?.widgets)             return parsed.default.widgets;
  if (parsed.widgets)                       return parsed.widgets;
  if (!Array.isArray(parsed))               return null;
  if (parsed[0]?.widgets)                   return parsed[0].widgets;
  if (Array.isArray(parsed[0]) && parsed[0][1]?.[0]?.widgets) return parsed[0][1][0].widgets;
  if (Array.isArray(parsed[1]) && parsed[1][0]?.widgets)      return parsed[1][0].widgets;
  return null;
}

module.exports = async (req, res) => {
  const q = (req.query.q || 'pelvic floor').trim();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  try {
    const hl = 'en-US', tz = '360', time = 'today 5-y';

    // ── Step 1: warm session, grab cookies ─────────────────────────────
    const warm = await get(
      `https://trends.google.com/trends/explore?date=today+5-y&q=${encodeURIComponent(q)}&hl=${hl}`
    );
    const cookie = (warm.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
    const ah = { Cookie: cookie };

    // ── Step 2: explore → get widget tokens ────────────────────────────
    const exploreUrl =
      `https://trends.google.com/trends/api/explore?hl=${hl}&tz=${tz}` +
      `&req=${encodeURIComponent(JSON.stringify({ comparisonItem: [{ keyword: q, geo: '', time }], category: 0, property: '' }))}` +
      `&uts=${Date.now()}&authuser=0`;

    const eRes = await get(exploreUrl, ah);
    if (eRes.status !== 200) throw new Error(`explore HTTP ${eRes.status}: ${eRes.body.slice(0, 200)}`);

    const widgets = findWidgets(parseGT(eRes.body));
    if (!widgets) throw new Error(`no widgets in response: ${eRes.body.slice(0, 300)}`);

    const tw = widgets.find(w => w.id === 'TIMESERIES');
    const gw = widgets.find(w => w.id === 'GEO_MAP');
    if (!tw) throw new Error(`TIMESERIES widget missing — ids: ${widgets.map(w => w.id).join(', ')}`);

    // ── Step 3: time series + geo in parallel ──────────────────────────
    const mkTimeUrl = () =>
      `https://trends.google.com/trends/api/widgetdata/multiline?hl=${hl}&tz=${tz}` +
      `&req=${encodeURIComponent(JSON.stringify({ time, resolution: 'WEEK', locale: hl, comparisonItem: tw.request.comparisonItem, requestOptions: { property: '', backend: 'IZG', category: 0 }, userConfig: { userType: 'USER_TYPE_LEGIT_USER' } }))}` +
      `&token=${encodeURIComponent(tw.token)}&geo=`;

    const mkGeoUrl = () =>
      `https://trends.google.com/trends/api/widgetdata/comparedgeo?hl=${hl}&tz=${tz}` +
      `&req=${encodeURIComponent(JSON.stringify({ resolution: 'COUNTRY', locale: hl, comparisonItem: gw.request.comparisonItem, requestOptions: { property: '', backend: 'IZG', category: 0 }, userConfig: { userType: 'USER_TYPE_LEGIT_USER' } }))}` +
      `&token=${encodeURIComponent(gw.token)}&geo=`;

    const [tRes, gRes] = await Promise.all([
      get(mkTimeUrl(), ah),
      gw ? get(mkGeoUrl(), ah).catch(() => null) : Promise.resolve(null),
    ]);

    if (tRes.status !== 200) throw new Error(`multiline HTTP ${tRes.status}: ${tRes.body.slice(0, 200)}`);
    const timeline = parseGT(tRes.body).default?.timelineData || [];
    if (!timeline.length) return res.status(404).json({ error: 'empty timeline' });

    let countries = [];
    if (gRes?.status === 200) {
      try {
        const geoEntries = parseGT(gRes.body).default?.geoMapData || [];
        countries = geoEntries
          .filter(d => TIER_COUNTRIES.has(d.geoCode) && d.value?.[0] > 0)
          .sort((a, b) => b.value[0] - a.value[0])
          .slice(0, 12)
          .map(d => ({ code: d.geoCode, name: d.geoName, value: d.value[0] }));
      } catch (_) {}
    }

    const step = Math.max(1, Math.floor(timeline.length / 60));
    const filtered = timeline.filter((_, i) => i % step === 0);
    res.json({
      keyword: q,
      labels: filtered.map(d => d.formattedAxisTime || d.formattedTime),
      values: filtered.map(d => d.value?.[0] ?? 0),
      countries,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
