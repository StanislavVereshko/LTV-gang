const googleTrends = require('google-trends-api');

module.exports = async (req, res) => {
  const q = (req.query.q || 'pelvic floor').trim();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  try {
    const startTime = new Date();
    startTime.setFullYear(startTime.getFullYear() - 5);

    const raw = await googleTrends.interestOverTime({
      keyword: q,
      startTime,
      geo: '',
    });

    const parsed = JSON.parse(raw);
    const timeline = parsed.default.timelineData;

    if (!timeline || !timeline.length) {
      return res.status(404).json({ error: 'No data returned' });
    }

    // Return one point per ~4 weeks to keep payload small
    const step = Math.max(1, Math.floor(timeline.length / 60));
    const filtered = timeline.filter((_, i) => i % step === 0);

    res.json({
      keyword: q,
      labels: filtered.map(d => d.formattedAxisTime || d.formattedTime),
      values: filtered.map(d => d.value[0]),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
