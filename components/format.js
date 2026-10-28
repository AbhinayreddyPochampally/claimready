export const inr = n => (n === null || n === undefined || Number.isNaN(n)) ? '–' : 'Rs ' + Math.round(n).toLocaleString('en-IN');
export const secs = ms => ms == null ? '–' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
export function decisionChip(d) {
  if (!d) return { cls: 'new', label: 'Not processed' };
  if (d.status === 'AUTO_APPROVED') return { cls: 'good', label: 'Auto-approved' };
  if (d.status === 'ADJUDICATOR_REVIEW' && d.lane === 'flagged') return { cls: 'bad', label: 'Flagged for adjudicator' };
  if (d.status === 'ADJUDICATOR_REVIEW') return { cls: 'warn', label: 'Clean, above auto limit' };
  if (d.status === 'QUERY') return { cls: 'warn', label: 'Insurer query' };
  return { cls: 'new', label: d.status };
}
