/**
 * Helper to format draw rows into the exact ResultSets shape expected by the frontend.
 *
 * Frontend expects:
 * {
 *   single: [ { date: 'May 24, 2026', morning: '7', day: '3', evening: '2' }, ... ],
 *   double: [ { date: 'May 24, 2026', morning: '27', day: '39', evening: '12' }, ... ],
 *   triple: [ { date: 'May 24, 2026', morning: '827', day: '039', evening: '712' }, ... ]
 * }
 */

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const dateObj = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const buildResultSets = (draws) => {
  // Map of drawDate -> { morning, day, evening }
  const dateMap = new Map();

  for (const draw of draws) {
    const d = draw.drawDate;
    if (!dateMap.has(d)) {
      dateMap.set(d, {});
    }
    dateMap.get(d)[draw.session] = draw;
  }

  const single = [];
  const double = [];
  const triple = [];

  for (const [dateStr, sessions] of dateMap.entries()) {
    const formatted = formatDate(dateStr);
    const morning = sessions.morning;
    const day = sessions.day;
    const evening = sessions.evening;

    single.push({
      date: formatted,
      rawDate: dateStr,
      morning: morning?.singleDigit ?? '-',
      day: day?.singleDigit ?? '-',
      evening: evening?.singleDigit ?? '-',
    });

    double.push({
      date: formatted,
      rawDate: dateStr,
      morning: morning?.doubleDigit ?? '-',
      day: day?.doubleDigit ?? '-',
      evening: evening?.doubleDigit ?? '-',
    });

    triple.push({
      date: formatted,
      rawDate: dateStr,
      morning: morning?.tripleDigit ?? '-',
      day: day?.tripleDigit ?? '-',
      evening: evening?.tripleDigit ?? '-',
    });
  }

  return { single, double, triple };
};

module.exports = { formatDate, buildResultSets };

