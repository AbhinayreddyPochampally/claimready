import { POLICY, PACKAGES, FAST_LANE_CAP, NON_PAYABLE_KEYWORDS } from './policy';
import { PRIOR_DOC_INDEX, billTotal } from './data';
import { insurerDecide } from './insurer';

const ROOM_CAP = 5000;
const ICU_CAP = 10000;

export function initState(claim) {
  const c = JSON.parse(JSON.stringify(claim));
  return {
    claimId: c.id,
    claim: { ...c, his: undefined },
    his: c.his || [],
    removedLines: [],
    flags: [],
    deskMessages: [],
    facts: null,
    pendingApproval: null,
    submissions: 0,
    decision: null,
    done: false
  };
}

function monthsBetween(a, b) {
  const d1 = new Date(a), d2 = new Date(b);
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function supportedTags(state) {
  const s = new Set();
  state.claim.documents.forEach(d => (d.supports || []).forEach(t => s.add(t)));
  return s;
}

// ---------- Deterministic engines (also reused by the insurer, which re-checks everything) ----------

const rs = n => 'Rs ' + Math.round(n || 0).toLocaleString('en-IN');

export function runPolicyChecks(state) {
  const c = state.claim;
  const checks = [];
  const tags = supportedTags(state);
  const tenure = monthsBetween(c.policyStart, c.admission);

  // Waiting periods
  const specific = ['K80', 'K40', 'H25', 'M17'].some(p => c.icd.startsWith(p));
  checks.push(specific && tenure < 24
    ? { clause: 'C4.2', status: 'fail', detail: `Condition has a 24-month waiting period; policy tenure is ${tenure} months.` }
    : { clause: 'C4.2', status: 'pass', detail: `Policy tenure ${tenure} months; no waiting period applies.` });

  // Room rent and proportionate deduction
  let roomDeduction = 0;
  if (c.room && c.room.ratePerDay > ROOM_CAP) {
    const ratio = ROOM_CAP / c.room.ratePerDay;
    const excess = (c.room.ratePerDay - ROOM_CAP) * c.room.days;
    const associated = c.bill.filter(l => l.category === 'professional').reduce((s, l) => s + l.amount, 0);
    const prop = Math.round(associated * (1 - ratio));
    roomDeduction = excess + prop;
    checks.push({ clause: 'C3.1', status: 'warn', detail: `Room ${rs(c.room.ratePerDay)}/day exceeds cap ${rs(ROOM_CAP)}. Excess ${rs(excess)} plus proportionate cut of ${Math.round((1 - ratio) * 100)}% on doctor and nursing charges (${rs(prop)}). Patient pays ${rs(roomDeduction)}.`, amount: roomDeduction });
  } else {
    checks.push({ clause: 'C3.1', status: 'pass', detail: `Room ${rs(c.room ? c.room.ratePerDay : 0)}/day within cap ${rs(ROOM_CAP)}.` });
  }

  if (c.icu) {
    checks.push(c.icu.ratePerDay > ICU_CAP
      ? { clause: 'C3.2', status: 'warn', detail: `ICU ${rs(c.icu.ratePerDay)}/day exceeds cap ${rs(ICU_CAP)}.` }
      : { clause: 'C3.2', status: 'pass', detail: `ICU ${rs(c.icu.ratePerDay)}/day within cap ${rs(ICU_CAP)}.` });
  }

  // Non-payables found in itemised pharmacy statements
  const nonPay = [];
  c.documents.forEach(d => (d.nonPayable || []).forEach(n => nonPay.push(n)));
  const nonPayTotal = nonPay.reduce((s, n) => s + n.amount, 0);
  checks.push(nonPayTotal > 0
    ? { clause: 'C6.3', status: 'warn', detail: `Non-payable items in pharmacy bill: ${nonPay.map(n => `${n.item} ${rs(n.amount)}`).join(', ')}. Patient pays ${rs(nonPayTotal)}.`, amount: nonPayTotal }
    : { clause: 'C6.3', status: 'pass', detail: 'No IRDAI non-payable items found in itemised documents.' });

  // Package billing: code must be in the insurer master; no unbundled items
  const pkgLines = c.bill.filter(l => l.category === 'package');
  pkgLines.forEach(l => {
    const ok = PACKAGES.some(p => p.code === l.code);
    checks.push(ok
      ? { clause: 'C7.1', status: 'pass', detail: `${l.id} billed under insurer package ${l.code}.`, line: l.id }
      : { clause: 'C7.1', status: 'fail', detail: `${l.id} uses hospital code ${l.code}, which is not in the insurer package master. Needs mapping.`, line: l.id });
  });
  const unbundled = pkgLines.length ? c.bill.filter(l => l.category === 'consumable') : [];
  unbundled.forEach(l => checks.push({ clause: 'C7.1', status: 'fail', detail: `${l.id} "${l.desc}" (${rs(l.amount)}) is included in the package and cannot be billed separately.`, line: l.id }));

  // Co-pay
  let copay = 0;
  if (c.patient.age >= 61) checks.push({ clause: 'C5.4', status: 'warn', detail: 'Patient is 61 or above: 10% co-payment applies.' });
  else checks.push({ clause: 'C5.4', status: 'pass', detail: 'No co-payment applies.' });

  // Required documents
  const missing = [];
  ['PREAUTH', 'DISCHARGE_SUMMARY', 'FINAL_BILL'].forEach(t => { if (!tags.has(t)) missing.push(t); });
  if (c.bill.some(l => l.category === 'pharmacy') && !tags.has('PHARMACY_ITEMISED')) missing.push('PHARMACY_ITEMISED');
  if (c.icu) for (let d = 1; d <= c.icu.days; d++) if (!tags.has(`ICU_NOTES_DAY_${d}`)) missing.push(`ICU_NOTES_DAY_${d}`);
  checks.push(missing.length
    ? { clause: 'C8.2', status: 'fail', detail: `Missing required documents: ${missing.join(', ')}.`, missing }
    : { clause: 'C8.2', status: 'pass', detail: 'All required documents present.' });

  const fin = financials(state, { roomDeduction, nonPayTotal });
  copay = fin.copay;
  return { checks, financials: fin, missing };
}

export function financials(state, { roomDeduction = 0, nonPayTotal = 0 } = {}) {
  const c = state.claim;
  const claimed = billTotal(c.bill);
  // Items billed outside an all-inclusive package (C7.1) are disputed: not admissible, not charged to the patient; the adjudicator decides.
  const hasPkg = c.bill.some(l => l.category === 'package');
  const disputed = hasPkg ? c.bill.filter(l => l.category === 'consumable').reduce((s, l) => s + l.amount, 0) : 0;
  const afterDeductions = Math.max(0, claimed - roomDeduction - nonPayTotal - disputed);
  const copay = c.patient.age >= 61 ? Math.round(afterDeductions * 0.1) : 0;
  const admissible = afterDeductions - copay;
  return { claimed, roomDeduction, nonPayTotal, copay, disputed, admissible, patientPayable: claimed - admissible - disputed };
}

export function linkEvidence(state) {
  const tags = supportedTags(state);
  return state.claim.bill.map(l => {
    const missing = (l.needs || []).filter(t => !tags.has(t));
    const docs = state.claim.documents.filter(d => (d.supports || []).some(t => (l.needs || []).includes(t))).map(d => d.title);
    return { line: l.id, desc: l.desc, amount: l.amount, linked: missing.length === 0, evidence: docs, missing };
  });
}

export function duplicateCheck(state) {
  const hits = [];
  state.claim.documents.forEach(d => {
    if (!d.hash) return;
    PRIOR_DOC_INDEX.filter(p => p.hash === d.hash).forEach(p => hits.push({ document: d.title, matches: p }));
  });
  return hits;
}

// ---------- Tool definitions exposed to the model ----------

export const TOOL_DEFS = [
  { name: 'read_claim_file', description: 'Read the claim file: patient, policy, admission, room, bill lines and the documents currently attached. Always call first.', parameters: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'extract_clinical_facts', description: 'Read the discharge summary and clinical documents and extract structured facts (diagnosis, procedures, ICU days, symptoms, tests clinically indicated). Uses LLM (rule-based when no model is configured) extraction.', parameters: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'check_policy', description: 'Run the policy rules engine (room rent, ICU cap, waiting periods, co-pay, non-payables, package billing, required documents). Returns pass/warn/fail per clause with citations and the financials.', parameters: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'link_evidence', description: 'Link every bill line to the clinical document that supports it. Returns linked and unlinked lines with the evidence tag that is missing.', parameters: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'map_charge_code', description: 'Suggest the insurer package code (from the closed insurer package master) for a bill line that uses a hospital code.', parameters: { type: 'object', properties: { line_id: { type: 'string' } }, required: ['line_id'], additionalProperties: false } },
  { name: 'apply_code_mapping', description: 'Replace a bill line code with an insurer package code from the master list. Does not change any amount.', parameters: { type: 'object', properties: { line_id: { type: 'string' }, package_code: { type: 'string' } }, required: ['line_id', 'package_code'], additionalProperties: false } },
  { name: 'search_hospital_records', description: 'Search the hospital information system (pharmacy, lab, radiology, ICU nursing) for a missing document by evidence tag, e.g. PHARMACY_ITEMISED, ICU_NOTES_DAY_3, MRI_BRAIN. Attaches it to the file if found.', parameters: { type: 'object', properties: { evidence_tag: { type: 'string' }, reason: { type: 'string' } }, required: ['evidence_tag'], additionalProperties: false } },
  { name: 'propose_bill_change', description: 'Propose removing a bill line (for example an item already included in a package). Changes money, so the desk executive must approve; the run pauses until they decide.', parameters: { type: 'object', properties: { line_id: { type: 'string' }, reason: { type: 'string' } }, required: ['line_id', 'reason'], additionalProperties: false } },
  { name: 'check_duplicate_documents', description: 'Compare fingerprints of attached reports and images with documents from prior claims to detect reused or copied documents.', parameters: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'notify_desk', description: 'Send the desk executive a message, e.g. the amount the patient must pay before discharge and why.', parameters: { type: 'object', properties: { message: { type: 'string' }, patient_payable: { type: 'number' } }, required: ['message'], additionalProperties: false } },
  { name: 'flag_for_review', description: 'Flag a concern for the insurer adjudicator (never a denial). Use when something cannot be resolved at the hospital.', parameters: { type: 'object', properties: { line_id: { type: 'string' }, reason: { type: 'string' } }, required: ['reason'], additionalProperties: false } },
  { name: 'submit_claim', description: 'Submit the claim packet to the insurer / TPA. Returns the insurer decision: AUTO_APPROVED, ADJUDICATOR_REVIEW, or QUERY with the items requested.', parameters: { type: 'object', properties: {}, additionalProperties: false } }
].map(f => ({ type: 'function', function: f }));

// ---------- Executors ----------

export async function executeTool(name, args, state, ctx = {}) {
  const c = state.claim;
  switch (name) {
    case 'read_claim_file': {
      return {
        patient: c.patient, policy: { insurer: POLICY.insurer, product: POLICY.product, sumInsured: POLICY.sumInsured, start: c.policyStart, tenureMonths: monthsBetween(c.policyStart, c.admission) },
        admission: c.admission, discharge: c.discharge, diagnosis: `${c.diagnosis} (${c.icd})`, procedure: c.procedure,
        room: c.room, icu: c.icu || null, preauthAmount: c.preauthAmount,
        bill: c.bill.map(l => ({ id: l.id, code: l.code, desc: l.desc, category: l.category, amount: l.amount })),
        billTotal: billTotal(c.bill),
        documents: c.documents.map(d => ({ id: d.id, title: d.title, type: d.type }))
      };
    }
    case 'extract_clinical_facts': {
      const facts = ctx.extract ? await ctx.extract(c) : fallbackFacts(c);
      state.facts = facts;
      return facts;
    }
    case 'check_policy': {
      const r = runPolicyChecks(state);
      return { checks: r.checks.map(x => ({ clause: x.clause, title: POLICY.clauses[x.clause].title, status: x.status, detail: x.detail })), financials: r.financials, missingDocuments: r.missing };
    }
    case 'link_evidence': {
      const links = linkEvidence(state);
      return { lines: links, unlinked: links.filter(l => !l.linked).map(l => ({ line: l.line, desc: l.desc, amount: l.amount, missing: l.missing })) };
    }
    case 'map_charge_code': {
      const line = c.bill.find(l => l.id === args.line_id);
      if (!line) return { error: `No line ${args.line_id}` };
      const text = `${line.desc} ${c.procedure}`.toLowerCase();
      const scored = PACKAGES.map(p => {
        const words = p.name.toLowerCase().split(/\s+/);
        const hit = words.filter(w => text.includes(w.slice(0, 6))).length / words.length;
        return { code: p.code, name: p.name, rate: p.rate, score: Math.round(hit * 100) / 100 };
      }).sort((a, b) => b.score - a.score);
      const best = scored[0];
      return { line: line.id, hospitalCode: line.code, suggestion: best, confidence: best.score >= 0.6 ? 'high' : 'low', billedAmount: line.amount, withinPackageRate: line.amount <= best.rate, alternatives: scored.slice(1, 3) };
    }
    case 'apply_code_mapping': {
      const line = c.bill.find(l => l.id === args.line_id);
      const pkg = PACKAGES.find(p => p.code === args.package_code);
      if (!line) return { error: `No line ${args.line_id}` };
      if (!pkg) return { error: `${args.package_code} is not in the insurer package master. Choose from: ${PACKAGES.map(p => p.code).join(', ')}` };
      const old = line.code; line.code = pkg.code; line.desc = `${pkg.name} package`;
      return { line: line.id, from: old, to: pkg.code, amountUnchanged: line.amount };
    }
    case 'search_hospital_records': {
      const tag = args.evidence_tag;
      if (supportedTags(state).has(tag)) return { found: true, alreadyAttached: true, tag };
      const doc = state.his.find(h => (h.supports || []).includes(tag));
      if (!doc) return { found: false, tag, searched: ['pharmacy system', 'lab system', 'radiology PACS', 'ICU nursing notes'], note: `No order, report or record for ${tag} exists in hospital systems.` };
      state.his = state.his.filter(h => h !== doc);
      const attached = { ...doc, id: `D${c.documents.length + 1}`, fetched: true };
      c.documents.push(attached);
      return { found: true, tag, attached: { id: attached.id, title: attached.title, source: doc.source, text: doc.text } };
    }
    case 'propose_bill_change': {
      const line = c.bill.find(l => l.id === args.line_id);
      if (!line) return { error: `No line ${args.line_id}` };
      if (ctx.approval && ctx.approval.line_id === args.line_id) {
        if (ctx.approval.decision === 'approve') {
          c.bill = c.bill.filter(l => l.id !== args.line_id);
          state.removedLines.push({ ...line, reason: args.reason });
          return { approved: true, by: 'Desk executive', removed: { id: line.id, desc: line.desc, amount: line.amount }, newBillTotal: billTotal(c.bill) };
        }
        return { approved: false, by: 'Desk executive', note: 'Desk rejected the change. The line stays on the bill and goes to the adjudicator as a disputed item under C7.1.' };
      }
      state.pendingApproval = { line_id: line.id, desc: line.desc, amount: line.amount, reason: args.reason };
      return { pending: true };
    }
    case 'check_duplicate_documents': {
      const hits = duplicateCheck(state);
      return { checked: c.documents.filter(d => d.hash).length, matches: hits };
    }
    case 'notify_desk': {
      state.deskMessages.push({ message: args.message, patient_payable: args.patient_payable ?? null });
      return { delivered: true };
    }
    case 'flag_for_review': {
      state.flags.push({ line: args.line_id || null, reason: args.reason });
      return { flagged: true, totalFlags: state.flags.length };
    }
    case 'submit_claim': {
      state.submissions += 1;
      const t0 = Date.now();
      const decision = insurerDecide(state);
      // recheckMs = real compute time of the simulated insurer's re-verification.
      // simulatedMs = a fixed stand-in for insurer system latency (no real insurer is connected).
      decision.recheckMs = Date.now() - t0;
      decision.decisionMs = decision.recheckMs + decision.simulatedMs;
      decision.simulated = true;
      state.decision = decision;
      if (decision.status !== 'QUERY') state.done = true;
      return decision;
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

export function fallbackFacts(c) {
  const ds = (c.documents.find(d => d.type === 'DISCHARGE_SUMMARY') || {}).text || '';
  return {
    diagnosis: c.diagnosis, icd: c.icd, procedures: [c.procedure],
    icuDays: c.icu ? c.icu.days : 0, roomDays: c.room ? c.room.days : 0,
    neurologicalSymptoms: /no neurological|no headache/i.test(ds) ? false : null,
    summary: ds.slice(0, 220)
  };
}

export { FAST_LANE_CAP, NON_PAYABLE_KEYWORDS };
