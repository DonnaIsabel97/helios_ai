// Bucket saved predictions by UTC recording date, never by a fabricated date.
export function buildPredictionTrend(rows, classify, days = 30) {
  const dated = [];
  let skipped = 0;
  for (const row of rows) {
    const timestamp = row.created_at ? Date.parse(row.created_at) : NaN;
    if (!Number.isFinite(timestamp)) {
      skipped += 1;
      continue;
    }
    dated.push({ day: new Date(timestamp).toISOString().slice(0, 10), key: classify(row) });
  }
  if (!dated.length) return { data: [], skipped, total: 0 };

  const dates = dated.map((row) => row.day).sort();
  const end = new Date(`${dates.at(-1)}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const first = new Date(`${dates[0]}T00:00:00Z`);
  if (first > start) start.setTime(first.getTime());

  // Include zero-count days between records so gaps remain visible.
  const buckets = new Map();
  for (const day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    buckets.set(date, { date, primary: 0, secondary: 0, unknown: 0 });
  }
  let total = 0;
  for (const row of dated) {
    const bucket = buckets.get(row.day);
    if (bucket) {
      bucket[row.key === 'primary' || row.key === 'secondary' ? row.key : 'unknown'] += 1;
      total += 1;
    }
  }
  return { data: [...buckets.values()], skipped, total };
}
