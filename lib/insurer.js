// Simulated insurer / TPA. It never trusts the hospital's checks: it re-runs the rules engine,
// evidence links and duplicate check, then applies the fast-lane rule (FL-1).
import { runPolicyChecks, linkEvidence, duplicateCheck } from './tools';
import { FAST_LANE_CAP } from './policy';

export function insurerDecide(state) {
  const { checks, financials, missing } = runPolicyChecks(state);
  const links = linkEvidence(state);
  const unlinked = links.filter(l => !l.linked);
  const dups = duplicateCheck(state);
  const fails = checks.filter(c => c.status === 'fail');

  if (missing.length) {
    return { status: 'QUERY', simulatedMs: 1800, items: missing, message: `Query raised: please send ${missing.join(', ')} (clause C8.2).`, reverified: true };
  }

  const reasons = [];
  fails.forEach(f => reasons.push(`${f.clause}: ${f.detail}`));
  unlinked.forEach(u => reasons.push(`Bill line ${u.line} "${u.desc}" has no supporting clinical record (${u.missing.join(', ')}).`));
  dups.forEach(d => reasons.push(`${d.document} matches a document in claim ${d.matches.claimRef} (${d.matches.patient}, ${d.matches.hospital}).`));
  state.flags.forEach(f => reasons.push(`Hospital agent flag: ${f.reason}`));

  if (reasons.length) {
    return { status: 'ADJUDICATOR_REVIEW', lane: 'flagged', simulatedMs: 2400, reasons, financials, reverified: true, note: 'Routed to a medical adjudicator with the evidence map. Only the claims review committee can deny.' };
  }
  if (financials.admissible > FAST_LANE_CAP) {
    return { status: 'ADJUDICATOR_REVIEW', lane: 'clean-above-limit', simulatedMs: 2100, reasons: [`Clean packet, but admissible amount Rs ${financials.admissible} is above the fast-lane limit of Rs ${FAST_LANE_CAP} (FL-1).`], financials, reverified: true, note: 'Clean packet: adjudicator only confirms, no query expected.' };
  }
  return { status: 'AUTO_APPROVED', lane: 'fast', simulatedMs: 2600, financials, approvedAmount: financials.admissible, patientPayable: financials.patientPayable, reverified: true, note: 'All checks re-verified by the insurer. Approved under fast-lane rule FL-1.' };
}
