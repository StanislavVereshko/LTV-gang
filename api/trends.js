const googleTrends = require('google-trends-api');

const TIER_COUNTRIES = new Set([
  'US','GB','CA','AU','NZ','IE',
  'DE','FR','NL','SE','NO','CH','AT','BE','DK','FI',
  'ES','IT','PT','PL','CZ','SK','HU','RO',
  'JP','KR','SG','HK','TW',
  'AE','IL','SA',
  'BR','MX','AR','CL','CO',
  'ZA',
]);

function withTimeout(p, ms) {
  return Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

module.exports = async (req, res) => {
  const q = (req.query.q || 'pelvic floor').trim();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  try {
    const startTime = new Date();
    startTime.setFullYear(startTime.getFullYear() - 5);

    // Both requests in parallel — faster, stays within function timeout.
    // Region request failure is silently ignored (chart still renders without country table).
    const [rawTime, rawRegion] = await Promise.all([
      withTimeout(
        googleTrends.interestOverTime({ keyword: q, startTime, geo: '' }),
        22000
      ),
      withTimeout(
        googleTrends.interestByRegion({ keyword: q, startTime, geo: '', resolution: 'COUNTRY' }),
        22000
      ).catch(() => null),
    ]);

    const parsed = JSON.parse(rawTime);
    const timeline = parsed.default.timelineData;

    if (!timeline || !timeline.length) {
      return res.status(404).json({ error: 'No data returned' });
    }

    const step = Math.max(1, Math.floor(timeline.length / 60));
    const filtered = timeline.filter((_, i) => i % step === 0);

    let countries = [];
    if (rawRegion) {
      try {
        const parsedRegion = JSON.parse(rawRegion);
        const geoData = parsedRegion.default.geoMapData || [];
        countries = geoData
          .filter(d => TIER_COUNTRIES.has(d.geoCode) && d.value && d.value[0] > 0)
          .sort((a, b) => b.value[0] - a.value[0])
          .slice(0, 12)
          .map(d => ({ code: d.geoCode, name: d.geoName, value: d.value[0] }));
      } catch (_) {}
    }

    res.json({
      keyword: q,
      labels: filtered.map(d => d.formattedAxisTime || d.formattedTime),
      values: filtered.map(d => d.value[0]),
      countries,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
