export const inr = n => (n === null || n === undefined || Number.isNaN(n)) ? '–' : 'Rs ' + Math.round(n).toLocaleString('en-IN');
export const secs = ms => ms == null ? '–' : ms < 1000 ? `${Math.round(ms)} ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s`;
export function decisionChip(d) {
  if (!d) return { cls: 'none', label: 'Not run yet' };
  if (d.status === 'AUTO_APPROVED') return { cls: 'ok', label: 'Auto-approved' };
  if (d.status === 'ADJUDICATOR_REVIEW' && d.lane === 'flagged') return { cls: 'flag', label: 'Flagged to adjudicator' };
  if (d.status === 'ADJUDICATOR_REVIEW') return { cls: 'hold', label: 'Clean, above auto limit' };
  if (d.status === 'QUERY') return { cls: 'hold', label: 'Insurer query' };
  return { cls: 'none', label: d.status };
}
export function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
export const when = iso => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST';
