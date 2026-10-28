'use client';
import { useRef, useState, useEffect } from 'react';
import { inr, secs, decisionChip } from './format';

const TOOL = {
  read_claim_file: ['file', 'Read the claim file', 'check'],
  extract_clinical_facts: ['file', 'Extract clinical facts', 'check'],
  check_policy: ['policy', 'Run policy rules', 'check'],
  link_evidence: ['evidence', 'Link bill lines to evidence', 'check'],
  map_charge_code: ['agent', 'Map hospital code to insurer package', 'fix'],
  apply_code_mapping: ['agent', 'Apply insurer package code', 'fix'],
  search_hospital_records: ['agent', 'Search hospital records', 'fix'],
  propose_bill_change: ['desk', 'Propose a bill change (needs the desk)', 'fix'],
  check_duplicate_documents: ['agent', 'Check for reused documents', 'check'],
  notify_desk: ['agent', 'Message the desk', 'fix'],
  flag_for_review: ['agent', 'Flag for the insurer’s adjudicator', 'flag'],
  submit_claim: ['insurer', 'Submit packet to the insurer', 'submit']
};

const STEPS = [
  ['file', 'File', 'Bill and documents'],
  ['evidence', 'Evidence', 'Line-by-line links'],
  ['policy', 'Policy checks', 'Clause citations'],
  ['agent', 'Agent trace', 'Tool calls'],
  ['desk', 'Desk approval', 'Money changes'],
  ['insurer', 'Insurer result', 'Simulated re-check']
];

function summarize(name, args, r) {
  if (!r) return '';
  if (r.error) return `Error: ${r.error}`;
  switch (name) {
    case 'read_claim_file': return `${r.bill.length} bill lines and ${r.documents.length} documents, total ${inr(r.billTotal)}. Policy held for ${r.policy.tenureMonths} months.`;
    case 'extract_clinical_facts': return `${r.diagnosis || ''}${r.icuDays ? `, ICU ${r.icuDays} days` : ''}${r.neurologicalSymptoms === false ? ', no neurological symptoms recorded' : ''}. Extracted by ${r.extractedBy || 'rule-based reader'}.`;
    case 'check_policy': {
      const f = r.checks.filter(c => c.status === 'fail'), w = r.checks.filter(c => c.status === 'warn'), p = r.checks.filter(c => c.status === 'pass');
      return `${f.length} fail, ${w.length} warning, ${p.length} pass.${f.length ? ' ' + f.map(c => `${c.clause}: ${c.detail}`).join(' ') : ''}`;
    }
    case 'link_evidence': return `${r.lines.length - r.unlinked.length} of ${r.lines.length} lines linked.${r.unlinked.length ? ' Unlinked: ' + r.unlinked.map(u => `${u.line} ${u.desc} (needs ${u.missing.join(', ')})`).join('; ') : ''}`;
    case 'map_charge_code': return `${r.hospitalCode} maps to ${r.suggestion.code}, "${r.suggestion.name}" (${r.confidence} confidence). Billed ${inr(r.billedAmount)} against a package rate of ${inr(r.suggestion.rate)}.`;
    case 'apply_code_mapping': return `${r.line}: ${r.from} changed to ${r.to}. Amount unchanged.`;
    case 'search_hospital_records': return r.found ? (r.alreadyAttached ? `${r.tag} is already attached.` : `Found "${r.attached.title}" in ${r.attached.source} and attached it to the file.`) : `Not found in ${r.searched.join(', ')}. ${r.note}`;
    case 'propose_bill_change': return r.approved ? `Approved by ${r.by}. Removed ${r.removed.desc} (${inr(r.removed.amount)}). New bill ${inr(r.newBillTotal)}.` : r.note || 'Waiting for the desk.';
    case 'check_duplicate_documents': return r.matches.length ? r.matches.map(m => `"${m.document}" matches claim ${m.matches.claimRef} (${m.matches.patient}, ${m.matches.hospital}).`).join(' ') : `No matches across ${r.checked} report fingerprints.`;
    case 'notify_desk': return args.message;
    case 'flag_for_review': return args.reason;
    case 'submit_claim': return r.status === 'QUERY' ? r.message : r.status === 'AUTO_APPROVED' ? `Simulated insurer re-verified every check and auto-approved ${inr(r.approvedAmount)}.` : `Simulated insurer routed it to an adjudicator (${r.lane === 'flagged' ? 'flagged' : 'clean, above the auto limit'}).`;
    default: return '';
  }
}

function stepStatus(events, paused, final, running) {
  const done = new Set(events.filter(e => e.type === 'tool_result').map(e => TOOL[e.name] && TOOL[e.name][0]));
  const s = {};
  const open = [...events].reverse().find(e => e.type === 'tool_call');
  const openStage = open && !events.slice(events.lastIndexOf(open)).some(e => e.type === 'tool_result' && e.name === open.name) ? TOOL[open.name] && TOOL[open.name][0] : null;
  const human = events.some(e => e.type === 'human');
  for (const [k] of STEPS) s[k] = done.has(k) ? 'done' : '';
  if (events.length) s.agent = final ? 'done' : 'active';
  if (paused) s.desk = 'attn';
  else if (human) s.desk = 'done';
  else if (final) s.desk = 'skip';
  if (final && final.decision) s.insurer = final.decision.status === 'AUTO_APPROVED' ? 'done' : final.decision.lane === 'flagged' ? 'flag' : 'attn';
  if (final && final.state && final.state.evidence && final.state.evidence.some(x => !x.linked)) s.evidence = 'flag';
  if (final && final.state && final.state.checks && final.state.checks.some(x => x.status === 'fail')) s.policy = 'flag';
  if (running && openStage && s[openStage] !== 'done') s[openStage] = 'active';
  return s;
}
const STEP_NOTE = { done: 'Done', active: 'In progress', attn: 'Needs attention', flag: 'Open issue', skip: 'Not needed' };

export default function ClaimWorkspace({ claim, clauses, policy, planner, demo }) {
  const [events, setEvents] = useState([]);
  const [running, setRunning] = useState(false);
  const [snap, setSnap] = useState(null);
  const [paused, setPaused] = useState(null);
  const [final, setFinal] = useState(null);
  const [mode, setMode] = useState(null);
  const [openDoc, setOpenDoc] = useState(null);
  const [fetchedText, setFetchedText] = useState({});
  const [agentMs, setAgentMs] = useState(0);
  const [segStart, setSegStart] = useState(null);
  const [tick, setTick] = useState(0);
  const traceRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setTick(x => x + 1), 200);
    return () => clearInterval(i);
  }, [running]);
  useEffect(() => { if (traceRef.current) traceRef.current.scrollTop = traceRef.current.scrollHeight; }, [events, paused, final]);
  useEffect(() => {
    const id = paused ? 'desk' : final ? 'insurer' : null;
    if (!id) return;
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); const f = el.querySelector('button, [tabindex]'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 400); }
  }, [paused, final]);

  const liveMs = agentMs + (running && segStart ? Date.now() - segStart : 0);

  async function start(resume) {
    const t = Date.now();
    if (!resume) { setEvents([]); setSnap(null); setFinal(null); setFetchedText({}); setAgentMs(0); setMode(null); }
    const base = resume ? agentMs : 0;
    setPaused(null); setSegStart(t); setRunning(true);
    let res;
    try {
      res = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claimId: claim.id, resume, stepsSoFar: resume ? events.filter(x => x.type === 'tool_call').length : 0, runMsSoFar: base }) });
      if (!res.ok || !res.body) throw new Error(`server answered ${res.status}`);
    } catch (e) {
      setEvents(ev => [...ev, { type: 'error', text: `Could not reach the agent service (${e.message}). Nothing was submitted. Try the run again.` }]);
      setRunning(false); setAgentMs(base + (Date.now() - t)); setSegStart(null); return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx); buf = buf.slice(idx + 1);
        if (!line.trim()) continue;
        let e; try { e = JSON.parse(line); } catch { continue; }
        handle(e);
      }
    }
    setAgentMs(base + (Date.now() - t)); setSegStart(null); setRunning(false);
  }

  function handle(e) {
    if (e.type === 'start') setMode({ mode: e.mode, model: e.model, reason: e.reason });
    if (e.type === 'mode') setMode({ mode: e.mode, model: e.model, reason: e.reason, switched: true });
    if (e.state) setSnap(e.state);
    if (e.type === 'tool_result' && e.name === 'search_hospital_records' && e.result.attached) {
      setFetchedText(m => ({ ...m, [e.result.attached.id]: e.result.attached.text }));
    }
    if (e.type === 'paused') setPaused(e);
    if (e.type === 'final') {
      setFinal(e);
      try {
        const s = JSON.parse(localStorage.getItem('cr-status') || '{}');
        s[claim.id] = e.decision; localStorage.setItem('cr-status', JSON.stringify(s));
      } catch {}
    }
    if (e.type !== 'start' && e.type !== 'final') setEvents(ev => [...ev, e]);
  }

  function decide(decision) {
    start({ ...paused.resume, approval: { line_id: paused.approval.line_id, decision } });
  }

  const bill = snap ? snap.bill : claim.bill;
  const evidence = snap ? Object.fromEntries(snap.evidence.map(e => [e.line, e])) : {};
  const removed = snap ? snap.removedLines : [];
  const docs = snap ? snap.documents : claim.documents.map(d => ({ ...d, fetched: false }));
  const d = final && final.decision;
  const chip = decisionChip(d);
  const st = stepStatus(events, paused, final, running);
  const shownMode = mode || (planner.available ? { mode: 'llm', model: planner.model, pending: true } : { mode: 'fallback', model: 'deterministic planner', pending: true });

  return (
    <div>
      <div className="ws-head">
        <div>
          <a href="/desk" className="small">Back to the discharge queue</a>
          <h1 style={{ marginTop: 6 }}>{claim.patient.name}, claim {claim.id}</h1>
          <div className="ws-meta">
            <div><span>Patient</span>{claim.patient.age} {claim.patient.gender === 'M' ? 'male' : 'female'}</div>
            <div><span>Diagnosis</span>{claim.diagnosis} ({claim.icd})</div>
            <div><span>Treatment</span>{claim.procedure}</div>
            <div><span>Stay</span>{claim.admission} to {claim.discharge}</div>
            <div><span>Pre-auth</span>{inr(claim.preauthAmount)}</div>
          </div>
          {demo && <div className="ws-focus"><b>What this demo claim shows:</b> {demo.detail}</div>}
        </div>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
          <span className={`pill ${paused ? 'gate' : running ? 'info' : chip.cls}`}>{paused ? 'Waiting for desk approval' : running ? 'Agent running' : chip.label}</span>
          <button className="btn lg" disabled={running || !!paused} onClick={() => start(null)}>
            {running ? <><span className="pulse" /> Agent working, {secs(liveMs)}</> : paused ? 'Waiting for the desk' : events.length ? 'Run the agent again' : 'Run the agent'}
          </button>
        </div>
      </div>

      <nav className="stepper" aria-label="Claim walkthrough">
        {STEPS.map(([k, name, sub], i) => (
          <a key={k} href={`#${k}`} className={st[k] ? `s-${st[k]}` : ''}>
            <b>{i + 1}. {name}</b>{st[k] ? STEP_NOTE[st[k]] : sub}
          </a>
        ))}
      </nav>

      <div className="ws">
        <div>
          <section className="panel" id="file">
            <header><h2>1. Claim file</h2><span className="sect-note">Synthetic patient and documents</span></header>
            <div className="body">
              <div className="kv" style={{ marginBottom: 14 }}>
                <div>Insurer and policy</div><div>{policy.insurer}, {policy.product}, sum insured {inr(policy.sumInsured)}</div>
                <div>Policy since</div><div>{claim.policyStart}</div>
                <div>Room</div><div>{claim.room.category}, {inr(claim.room.ratePerDay)} a day for {claim.room.days} days{claim.icu ? `; ICU ${inr(claim.icu.ratePerDay)} a day for ${claim.icu.days} days` : ''}</div>
                <div>Desk note</div><div>{claim.deskNote}</div>
              </div>
              <h3 style={{ marginBottom: 8 }}>Documents in the file</h3>
              <div className="docs">
                {docs.map(doc => {
                  const full = claim.documents.find(x => x.id === doc.id);
                  const text = full ? full.text : fetchedText[doc.id];
                  const on = openDoc === doc.id;
                  return (
                    <div key={doc.id} className="doc">
                      <button aria-expanded={on} onClick={() => setOpenDoc(on ? null : doc.id)}>
                        <span>{doc.title}</span>
                        {doc.fetched ? <span className="pill info">Fetched by the agent</span> : <span className="small muted">{on ? 'Hide' : 'Read'}</span>}
                      </button>
                      {on && <div className="txt">{text || 'Text not available.'}{doc.source ? <div className="small muted" style={{ marginTop: 6 }}>Source: {doc.source}</div> : null}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="panel" id="evidence">
            <header><h2>2. Bill lines and evidence</h2><span className="sect-note">{snap ? 'Updated by the agent' : 'Not checked yet'}</span></header>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Line</th><th>Description and code</th><th className="num">Amount</th><th>Evidence</th></tr></thead>
                <tbody>
                  {bill.map(l => {
                    const ev = evidence[l.id];
                    const orig = claim.bill.find(x => x.id === l.id);
                    const changed = orig && orig.code !== l.code;
                    const issue = snap && snap.checks.find(c => c.status === 'fail' && c.line === l.id);
                    return (
                      <tr key={l.id}>
                        <td className="code">{l.id}</td>
                        <td>{l.desc}<div className="small muted">{changed ? <><span className="strike">{orig.code}</span> changed to <b>{l.code}</b></> : l.code}</div></td>
                        <td className="num">{inr(l.amount)}</td>
                        <td className="ev">{issue && <div style={{ marginBottom: 4 }}><span className="pill flag">Policy issue {issue.clause}</span></div>}{!ev ? <span className="pill none">Not checked</span> : ev.linked ? <><span className="pill ok">Linked</span><div className="muted" style={{ marginTop: 3 }}>{ev.evidence.join(', ')}</div></> : <><span className="pill flag">No record</span><div className="muted" style={{ marginTop: 3 }}>Needs {ev.missing.join(', ')}</div></>}</td>
                      </tr>
                    );
                  })}
                  {removed.map(l => (
                    <tr key={'r' + l.id}><td className="code strike">{l.id}</td><td><span className="strike">{l.desc}</span><div className="small" style={{ color: 'var(--gate)' }}>Removed after desk approval</div></td><td className="num strike">{inr(l.amount)}</td><td /></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {snap && (
              <div className="totals">
                <div><span>Claimed</span><b>{inr(snap.financials.claimed)}</b></div>
                <div><span>Admissible under the policy</span><b>{inr(snap.financials.admissible)}</b></div>
                <div><span>Patient pays at discharge</span><b>{inr(snap.financials.patientPayable)}</b>{snap.financials.copay ? <span>includes co-pay {inr(snap.financials.copay)}</span> : null}{snap.financials.disputed ? <span>{inr(snap.financials.disputed)} disputed, with the adjudicator</span> : null}</div>
              </div>
            )}
          </section>

          <section className="panel" id="policy">
            <header><h2>3. Policy checks</h2><span className="sect-note">Deterministic rules engine, not the language model</span></header>
            <div className="body">
              {!snap && <p className="muted">The rules run when the agent calls the policy tool. Each result cites the clause it comes from.</p>}
              {snap && snap.checks.map((c, i) => (
                <div className="check" key={i}>
                  <span><span className={`pill ${c.status === 'pass' ? 'ok' : c.status === 'warn' ? 'hold' : 'flag'}`}>{c.status === 'pass' ? 'Pass' : c.status === 'warn' ? 'Warning' : 'Fail'}</span></span>
                  <span className="cl">{c.clause}</span>
                  <span>{clauses[c.clause] ? clauses[c.clause].title : ''}<small>{c.detail}</small></span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="sticky">
          <section className="panel" id="agent">
            <header><h2>4. Agent trace</h2><span className="sect-note">{events.filter(e => e.type === 'tool_result').length} tool calls{agentMs || running ? `, ${secs(liveMs)} agent time` : ''}</span></header>
            <div className={`mode ${shownMode.mode === 'llm' ? 'llm' : 'fb'}`}>
              <span className={`pill ${shownMode.mode === 'llm' ? 'info' : 'hold'}`}>{shownMode.mode === 'llm' ? `LLM planner, ${shownMode.model}` : 'Deterministic fallback'}</span>
              <span>
                {shownMode.pending && shownMode.mode === 'llm' && <>This deployment has a model configured. The language model will choose each tool call; you will see its reasoning notes.</>}
                {shownMode.pending && shownMode.mode !== 'llm' && <>No language model is configured here, so the fallback planner will run the same tools in a fixed order. Its notes are scripted, not model output.</>}
                {!shownMode.pending && (mode.reason || '')}
              </span>
            </div>
            <div className={`trace ${paused ? 'compact' : d ? 'tight' : ''}`} ref={traceRef} aria-live="polite">
              {!events.length && !running && <p className="empty">Press <b>Run the agent</b>. Every card is a real tool call with its input and output; nothing is pre-recorded.</p>}
              {events.map((e, i) => {
                if (e.type === 'thought') return <div key={i} className={`note ${e.source === 'llm' ? 'llm' : ''}`}><i>{e.source === 'llm' ? 'LLM reasoning' : 'Planner note (scripted)'}</i>{e.text}</div>;
                if (e.type === 'notice') return <div key={i} className="sys">{e.text}</div>;
                if (e.type === 'mode') return <div key={i} className="sys"><b>Switched to the deterministic fallback.</b> {e.reason}</div>;
                if (e.type === 'human') return <div key={i} className="human">{e.text}</div>;
                if (e.type === 'error') return <div key={i} className="sys">{e.text}</div>;
                if (e.type === 'paused') return null;
                if (e.type === 'tool_call') {
                  const doneIt = events.slice(i + 1).some(x => x.type === 'tool_result' && x.name === e.name);
                  if (doneIt) return null;
                  if (paused && e.name === 'propose_bill_change') return null;
                  const [, label] = TOOL[e.name] || [null, e.name];
                  return <div key={i} className="ev-step"><div className="h"><b>{label}</b><span className="pulse" /></div></div>;
                }
                if (e.type === 'tool_result') {
                  const [, label, kind] = TOOL[e.name] || [null, e.name, 'check'];
                  return (
                    <div key={i} className={`ev-step k-${kind}`}>
                      <div className="h"><b>{label}</b><span>{e.name}, {secs(e.ms)}</span></div>
                      <div className="r">{summarize(e.name, e.args, e.result)}</div>
                      <details><summary>Tool input and output</summary><pre>{JSON.stringify({ input: e.args, output: e.result }, null, 2)}</pre></details>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            <div id="desk">
              {paused && (
                <div className="gatebox" role="region" aria-label="Desk approval needed">
                  <span className="pill gate">5. Desk approval needed</span>
                  <h3>Remove {paused.approval.line_id}, {paused.approval.desc}, {inr(paused.approval.amount)}?</h3>
                  <p className="small">{paused.approval.reason}</p>
                  <p className="small muted" style={{ marginTop: 6 }}>The agent has stopped. The billed amount changes only if you approve. Rejecting keeps the line and the agent continues.</p>
                  <div className="btns">
                    <button className="btn ok" onClick={() => decide('approve')}>Approve removal</button>
                    <button className="btn no" onClick={() => decide('reject')}>Reject and keep the line</button>
                  </div>
                </div>
              )}
            </div>

            <div id="insurer">
              {d && (
                <div className={`result ${d.status === 'AUTO_APPROVED' ? 'ok' : d.lane === 'flagged' ? 'flag' : 'hold'}`}>
                  <span className="small"><b>6. Insurer result</b> from the simulated insurer, which re-ran every check itself</span>
                  <div className="big">{d.status === 'AUTO_APPROVED' ? `Auto-approved, ${inr(d.approvedAmount)}` : d.lane === 'flagged' ? 'Flagged to a medical adjudicator' : 'Clean, sent to an adjudicator to confirm'}</div>
                  {d.status === 'AUTO_APPROVED' ? <p className="small">Patient pays {inr(d.patientPayable)}. {d.note}</p>
                    : <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>{(d.reasons || []).map((r, i) => <li key={i} className="small">{r}</li>)}</ul>}
                  {d.status !== 'AUTO_APPROVED' && <p className="small muted" style={{ marginTop: 6 }}>{d.note}</p>}
                  <div className="times">
                    <div><b>{secs(agentMs)}</b>Agent workflow time, this run, excluding time waiting for the desk{final.mode !== 'llm' ? '. Includes 0.6 s of on-screen pacing per step' : ''}</div>
                    <div><b>{secs(d.decisionMs)}</b>Insurer decision, simulated: re-check {secs(d.recheckMs)} plus a fixed {secs(d.simulatedMs)} stand-in delay</div>
                    <div><b>Not measured here</b>Real-world turnaround. The 64% decided in under 10 minutes comes from our simulation (see How it works)</div>
                  </div>
                  {final.summary && <p className="small" style={{ marginTop: 10 }}><b>{final.mode === 'llm' ? 'Summary written by the LLM:' : 'Summary (template text from the fallback planner):'}</b> {final.summary}</p>}
                </div>
              )}
              {final && !d && <div className="result hold"><div className="big">Not submitted</div><p className="small">{final.summary}</p></div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
