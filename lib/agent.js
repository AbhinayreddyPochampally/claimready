import OpenAI from 'openai';
import { TOOL_DEFS, executeTool, initState, runPolicyChecks, linkEvidence, duplicateCheck, fallbackFacts } from './tools';
import { getClaim } from './data';

export const SYSTEM_PROMPT = `You are ClaimReady, an AI agent working at a private hospital's insurance (TPA) desk in India.
Goal: send this cashless claim to the insurer complete, checked against the patient's policy, and with every bill line linked to clinical evidence, so it can be approved on arrival.

How to work:
1. read_claim_file, then extract_clinical_facts, then check_policy, then link_evidence.
2. Fix what you can at the hospital: map hospital codes to insurer package codes (map_charge_code, then apply_code_mapping); fetch missing documents from hospital records (search_hospital_records with the missing evidence tag); propose removing items billed separately from an inclusive package (propose_bill_change; the desk must approve).
3. After any change, re-run check_policy and link_evidence until the file is complete.
4. Always run check_duplicate_documents before submitting.
5. If the patient will pay anything (room-rent deduction, non-payables, co-pay), call notify_desk with the amount and the clause before submitting.
6. If something cannot be fixed (a billed item with no clinical record, a duplicate document, a test not clinically indicated), call flag_for_review with a clear reason. Never hide it. You never deny a claim; only the insurer's claims review committee can.
7. submit_claim. If the insurer returns QUERY, fetch the requested items and submit again.

Only apply a code when map_charge_code returns high confidence; otherwise flag_for_review so a person codes it.
Rules: never invent documents, findings or amounts. Never change an amount except through propose_bill_change. Cite clause IDs (e.g. C3.1, C7.1, C8.2) when you explain a problem.
Before every tool call, write ONE short sentence (max 20 words) saying what you are about to do and why.
After the insurer decision, write a 2-3 sentence summary for the desk executive: outcome, amount approved, what the patient pays, and what you fixed.`;

const MAX_STEPS = 24;

export async function runAgent({ claimId, resume, emit }) {
  const claim = getClaim(claimId);
  if (!claim) throw new Error(`Unknown claim ${claimId}`);
  const runStart = Date.now();
  const hasKey = !!process.env.OPENAI_API_KEY;
  const useLLM = hasKey && !(resume && resume.mode === 'fallback');
  if (useLLM) {
    try {
      const out = await runLLM({ claim, resume, emit, runStart });
      return out;
    } catch (e) {
      const reason = `The language model call failed (${String(e.message || e).slice(0, 140)}).`;
      emit({ type: 'mode', mode: 'fallback', model: 'deterministic planner', reason: reason + ' The deterministic fallback planner restarts the same tools from the beginning; no LLM decisions are used from here on.' });
      return runFallback({ claim, resume: resume && resume.approval ? { mode: 'fallback', approval: resume.approval } : null, emit, runStart, reason, announced: true });
    }
  }
  const reason = hasKey ? 'Resuming a run that was started by the deterministic planner.' : 'No OpenAI API key is configured on this deployment, so the deterministic fallback planner runs. It calls the same tools in a fixed order; no LLM is involved.';
  return runFallback({ claim, resume, emit, runStart, reason });
}

// ---------------- LLM agent ----------------

async function runLLM({ claim, resume, emit, runStart }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  let state, messages;
  const ctx = { extract: c => llmExtract(client, model, c) };

  if (resume && resume.mode === 'llm') {
    state = resume.state; messages = resume.messages;
    ctx.approval = resume.approval;
    state.pendingApproval = null;
    // Answer the tool call that paused the run
    const last = messages[messages.length - 1];
    const call = (last.tool_calls || []).find(tc => tc.function.name === 'propose_bill_change');
    const args = JSON.parse(call.function.arguments || '{}');
    emit({ type: 'human', text: resume.approval.decision === 'approve' ? `Desk approved: remove ${resume.approval.line_id}.` : `Desk rejected the change; ${resume.approval.line_id} stays on the bill.` });
    const t0 = Date.now();
    const result = await executeTool('propose_bill_change', args, state, ctx);
    messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    emit({ type: 'tool_result', name: 'propose_bill_change', args, result, ms: Date.now() - t0, state: snapshot(state) });
  } else {
    state = initState(claim);
    messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Process claim ${claim.id} for ${claim.patient.name}. Discharge has been advised. Prepare the file and submit it.` }
    ];
    emit({ type: 'start', mode: 'llm', model, state: snapshot(state), reason: `Live LLM planner: ${model} chooses every tool call through OpenAI function calling.` });
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    const resp = await client.chat.completions.create({
      model, messages, tools: TOOL_DEFS, tool_choice: 'auto', parallel_tool_calls: false, temperature: 0.2
    });
    const msg = resp.choices[0].message;
    messages.push({ role: 'assistant', content: msg.content || '', ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}) });
    if (msg.content) emit({ type: 'thought', text: msg.content, source: 'llm' });
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return finish(state, emit, 'llm', msg.content || '', { model, runStart });
    }
    for (const tc of msg.tool_calls) {
      let args = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch { args = {}; }
      emit({ type: 'tool_call', name: tc.function.name, args });
      const t0 = Date.now();
      const result = await executeTool(tc.function.name, args, state, ctx);
      if (result && result.pending) {
        emit({ type: 'paused', approval: state.pendingApproval, resume: { mode: 'llm', state, messages, approval: null } });
        return { paused: true };
      }
      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      emit({ type: 'tool_result', name: tc.function.name, args, result, ms: Date.now() - t0, state: snapshot(state) });
    }
  }
  return finish(state, emit, 'llm', 'Step limit reached before submission; the file is handed back to the desk executive.', { model, runStart });
}

async function llmExtract(client, model, c) {
  const docs = c.documents.filter(d => ['DISCHARGE_SUMMARY', 'OPERATIVE_NOTE', 'ICU_NOTES', 'REPORT'].includes(d.type)).map(d => `## ${d.title}\n${d.text}`).join('\n\n');
  try {
    const r = await client.chat.completions.create({
      model, temperature: 0, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Extract clinical facts from hospital documents. Reply with JSON only: {"diagnosis":string,"procedures":string[],"icuDays":number,"roomDays":number,"keySymptoms":string[],"neurologicalSymptoms":boolean|null,"testsDocumented":string[],"summary":string}. Use only what the documents say; null if not stated.' },
        { role: 'user', content: docs }
      ]
    });
    return { ...JSON.parse(r.choices[0].message.content), extractedBy: model };
  } catch {
    return { ...fallbackFacts(c), extractedBy: 'rule-based fallback' };
  }
}

// ---------------- Fallback planner (deterministic, no LLM) ----------------

async function runFallback({ claim, resume, emit, runStart, reason, announced }) {
  const state = initState(claim);
  const ctx = { approval: resume ? resume.approval : null };
  let silent = !!resume; // replay quietly up to the approval point
  const say = e => { if (!silent) emit(e); };
  const pause = ms => new Promise(r => setTimeout(r, silent ? 0 : ms));
  const call = async (name, args, thought) => {
    await pause(250);
    if (thought) say({ type: 'thought', text: thought, source: 'script' });
    await pause(350);
    say({ type: 'tool_call', name, args });
    const t0 = Date.now();
    const result = await executeTool(name, args, state, ctx);
    if (result && result.pending) {
      emit({ type: 'paused', approval: state.pendingApproval, resume: { mode: 'fallback' } });
      return { __paused: true };
    }
    if (name === 'propose_bill_change' && silent) {
      silent = false;
      emit({ type: 'human', text: ctx.approval.decision === 'approve' ? `Desk approved: remove ${ctx.approval.line_id}.` : `Desk rejected the change; ${ctx.approval.line_id} stays on the bill.` });
    }
    say({ type: 'tool_result', name, args, result, ms: Date.now() - t0, state: snapshot(state) });
    return result;
  };
  if (!resume && !announced) emit({ type: 'start', mode: 'fallback', model: 'deterministic planner', reason, state: snapshot(state) });

  await call('read_claim_file', {}, 'Reading the claim file to see the bill and the documents attached.');
  await call('extract_clinical_facts', {}, 'Extracting clinical facts from the discharge summary and reports.');
  let pc = await call('check_policy', {}, "Checking the bill against the patient's policy rules.");
  let le = await call('link_evidence', {}, 'Linking every bill line to the record that supports it.');

  for (const ch of pc.checks.filter(x => x.clause === 'C7.1' && x.status === 'fail' && /not in the insurer package master/.test(x.detail))) {
    const lineId = ch.detail.split(' ')[0];
    const m = await call('map_charge_code', { line_id: lineId }, `Line ${lineId} uses a hospital code; finding the insurer package code (C7.1).`);
    if (m.confidence !== 'high') {
      await call('flag_for_review', { line_id: lineId, reason: `No confident insurer package match for ${lineId} (${m.hospitalCode}); a person should code it.` }, `The best package match for ${lineId} is low confidence, so a person should code it.`);
      continue;
    }
    await call('apply_code_mapping', { line_id: lineId, package_code: m.suggestion.code }, `Applying ${m.suggestion.code}; the billed amount stays within the package rate.`);
  }
  const tags = new Set([...(pc.missingDocuments || []), ...le.unlinked.flatMap(u => u.missing)]);
  for (const tag of tags) {
    await call('search_hospital_records', { evidence_tag: tag, reason: 'Required to complete the file' }, `${tag} is missing; searching hospital systems for it.`);
  }
  for (const ch of pc.checks.filter(x => x.clause === 'C7.1' && x.status === 'fail' && /included in the package/.test(x.detail))) {
    const lineId = ch.detail.split(' ')[0];
    const r = await call('propose_bill_change', { line_id: lineId, reason: 'Included in the package rate under C7.1; cannot be billed separately.' }, `Line ${lineId} is already included in the package; asking the desk to remove it.`);
    if (r.__paused) return { paused: true };
    if (r && r.approved === false) {
      await call('flag_for_review', { line_id: lineId, reason: `Desk kept ${lineId} on the bill. It is billed outside an all-inclusive package (C7.1); the adjudicator should decide whether it is payable.` }, `The desk kept ${lineId}; flagging it as a disputed item instead of hiding it.`);
    }
  }
  pc = await call('check_policy', {}, 'Re-running the policy checks after the fixes.');
  le = await call('link_evidence', {}, 'Re-linking evidence after the fixes.');
  const dup = await call('check_duplicate_documents', {}, 'Checking reports for reuse from earlier claims before submitting.');

  for (const u of le.unlinked) {
    const indicated = state.facts && state.facts.neurologicalSymptoms === false && /MRI|CT/i.test(u.desc) ? ' Discharge summary records no neurological symptoms.' : '';
    await call('flag_for_review', { line_id: u.line, reason: `${u.desc} (${rs(u.amount)}) has no order or report in hospital systems.${indicated}` }, `Line ${u.line} cannot be supported; flagging it for the adjudicator instead of hiding it.`);
  }
  for (const m of dup.matches) {
    await call('flag_for_review', { reason: `${m.document} is identical to a report in claim ${m.matches.claimRef} (${m.matches.patient}, ${m.matches.hospital}).` }, 'A report matches a document from another patient’s claim; flagging it.');
  }
  if (pc.financials.patientPayable > 0) {
    const parts = pc.checks.filter(x => x.status === 'warn').map(x => `${x.clause} ${x.title}`).join('; ');
    await call('notify_desk', { message: `Patient will pay about ${rs(pc.financials.patientPayable)} at discharge (${parts}). Please inform the family before final billing.`, patient_payable: pc.financials.patientPayable }, 'The patient will owe money; telling the desk before discharge.');
  }
  const openFlags = state.flags.length;
  let d = await call('submit_claim', {}, openFlags ? `Submitting with ${openFlags} open flag(s) for the adjudicator.` : 'File is complete; submitting to the insurer.');
  if (d.status === 'QUERY') {
    for (const tag of d.items) await call('search_hospital_records', { evidence_tag: tag }, `Insurer asked for ${tag}; fetching it.`);
    d = await call('submit_claim', {}, 'Resubmitting with the requested documents.');
  }
  const summary = summaryText(state);
  emit({ type: 'thought', text: summary, source: 'script' });
  return finish(state, emit, 'fallback', summary, { model: 'deterministic planner', runStart, reason });
}

const rs = n => 'Rs ' + Math.round(n || 0).toLocaleString('en-IN');
function summaryText(state) {
  const d = state.decision;
  if (!d) return 'Not submitted.';
  const fixes = [];
  if (state.removedLines.length) fixes.push(`removed ${state.removedLines.map(l => l.desc).join(', ')}`);
  const fetched = state.claim.documents.filter(x => x.fetched).map(x => x.title);
  if (fetched.length) fixes.push(`fetched ${fetched.join(', ')}`);
  if (state.flags.length) fixes.push(`flagged ${state.flags.length} issue(s) for the adjudicator`);
  if (state.deskMessages.length) fixes.push('told the desk what the patient pays before discharge');
  const f = d.financials || {};
  if (d.status === 'AUTO_APPROVED') return `Approved automatically: ${rs(d.approvedAmount)}. Patient pays ${rs(d.patientPayable)}. ${fixes.length ? 'I ' + fixes.join('; ') + '.' : 'No fixes were needed.'}`;
  return `Sent to the insurer's adjudicator (${d.lane === 'flagged' ? 'flagged for review' : 'clean, above the auto-approval limit'}). Admissible amount ${rs(f.admissible)}${f.disputed ? `, with ${rs(f.disputed)} disputed` : ''}; patient pays about ${rs(f.patientPayable)}. ${fixes.length ? 'I ' + fixes.join('; ') + '.' : ''}`;
}

function finish(state, emit, mode, summary, meta = {}) {
  const out = { type: 'final', mode, model: meta.model || null, reason: meta.reason || null, runMs: meta.runStart ? Date.now() - meta.runStart : null, summary, state: snapshot(state), decision: state.decision };
  emit(out);
  return out;
}

export function snapshot(state) {
  const pc = runPolicyChecks(state);
  return {
    claimId: state.claimId,
    bill: state.claim.bill,
    documents: state.claim.documents.map(d => ({ id: d.id, title: d.title, type: d.type, fetched: !!d.fetched, source: d.source || null })),
    checks: pc.checks,
    financials: pc.financials,
    evidence: linkEvidence(state),
    duplicates: duplicateCheck(state),
    removedLines: state.removedLines,
    flags: state.flags,
    deskMessages: state.deskMessages,
    facts: state.facts,
    decision: state.decision
  };
}
