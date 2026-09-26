/** Helpers for "YYYY-MM-DD" photo dates (calendar dates, no time zone). */

function parts(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : undefined;
}

function toDate(iso: string) {
  const p = parts(iso);
  return p ? new Date(p.y, p.m - 1, p.d) : undefined;
}

/** "Mar 2025" */
export function formatMonthYear(iso: string | undefined) {
  const date = iso && toDate(iso);
  return date ? date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
}

/** "12 Mar 2025" (in the viewer's locale order) */
export function formatDay(iso: string | undefined) {
  const date = iso && toDate(iso);
  return date ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

/** "1 year 6 months later", "3 months later", "12 days later" — or '' if unknown/backwards. */
export function timeBetween(from: string | undefined, to: string | undefined) {
  const a = from && parts(from);
  const b = to && parts(to);
  if (!a || !b) return '';
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d < a.d) months--;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (months < 1) {
    const days = Math.round((toDate(to!)!.getTime() - toDate(from!)!.getTime()) / 86_400_000);
    if (days <= 0) return '';
    return days >= 7 ? `${plural(Math.floor(days / 7), 'week')} later` : `${plural(days, 'day')} later`;
  }
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years && plural(years, 'year'), rest && plural(rest, 'month')].filter(Boolean).join(' ') + ' later';
}
