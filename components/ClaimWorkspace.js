'use client';
import { useRef, useState, useEffect } from 'react';
import { inr, secs, decisionChip } from './format';

const TOOL_LABEL = {
  read_claim_file: ['Gather', 'Read the claim file', 'check'],
  extract_clinical_facts: ['Gather', 'Extract clinical facts (OCR + LLM)', 'check'],
  check_policy: ['Check policy', 'Rules engine', 'check'],
  link_evidence: ['Link evidence', 'Bill line ↔ clinical record', 'check'],
  map_charge_code: ['Fix', 'Map hospital code to insurer package', 'fix'],
  apply_code_mapping: ['Fix', 'Apply insurer package code', 'fix'],
  search_hospital_records: ['Fix', 'Search hospital records', 'fix'],
  propose_bill_change: ['Ask desk', 'Propose bill change (needs approval)', 'fix'],
  check_duplicate_documents: ['Check', 'Duplicate-document check', 'check'],
  notify_desk: ['Tell desk', 'Message to desk executive', 'fix'],
  flag_for_review: ['Flag', 'Flag for insurer adjudicator', 'fix'],
  submit_claim: ['Submit', 'Send packet to insurer / TPA', 'submit']
};

function summarize(name, args, r) {
  if (!r) return '';
  if (r.error) return `Error: ${r.error}`;
  switch (name) {
    case 'read_claim_file': return `${r.bill.length} bill lines, ${r.documents.length} documents, total ${inr(r.billTotal)}. Policy tenure ${r.policy.tenureMonths} months.`;
    case 'extract_clinical_facts': return `${r.diagnosis || ''}${r.icuDays ? ` · ICU ${r.icuDays} days` : ''}${r.neurologicalSymptoms === false ? ' · no neurological symptoms recorded' : ''}${r.extractedBy ? ` · by ${r.extractedBy}` : ''}`;
    case 'check_policy': {
      const f = r.checks.filter(c => c.status === 'fail'), w = r.checks.filter(c => c.status === 'warn'), p = r.checks.filter(c => c.status === 'pass');
      return `${f.length} fail · ${w.length} warn · ${p.length} pass.${f.length ? ' ' + f.map(c => `${c.clause}: ${c.detail}`).join(' ') : ''}`;
    }
    case 'link_evidence': return `${r.lines.length - r.unlinked.length} of ${r.lines.length} lines linked.${r.unlinked.length ? ' Unlinked: ' + r.unlinked.map(u => `${u.line} ${u.desc} (needs ${u.missing.join(', ')})`).join('; ') : ''}`;
    case 'map_charge_code': return `${r.hospitalCode} → ${r.suggestion.code} "${r.suggestion.name}" (${r.confidence} confidence). Billed ${inr(r.billedAmount)} vs package ${inr(r.suggestion.rate)}.`;
    case 'apply_code_mapping': return `${r.line}: ${r.from} → ${r.to}. Amount unchanged.`;
    case 'search_hospital_records': return r.found ? (r.alreadyAttached ? `${r.tag} already attached.` : `Found "${r.attached.title}" from ${r.attached.source}. Attached to the file.`) : `Not found. Searched ${r.searched.join(', ')}. ${r.note}`;
    case 'propose_bill_change': return r.approved ? `Approved by ${r.by}. Removed ${r.removed.desc} (${inr(r.removed.amount)}). New bill ${inr(r.newBillTotal)}.` : r.note || 'Waiting for desk approval';
    case 'check_duplicate_documents': return r.matches.length ? r.matches.map(m => `"${m.document}" matches claim ${m.matches.claimRef} (${m.matches.patient}, ${m.matches.hospital}).`).join(' ') : `No matches across ${r.checked} report fingerprints.`;
    case 'notify_desk': return args.message;
    case 'flag_for_review': return args.reason;
    case 'submit_claim': return r.status === 'QUERY' ? r.message : r.status === 'AUTO_APPROVED' ? `AUTO-APPROVED ${inr(r.approvedAmount)} in ${secs(r.decisionMs)}. Insurer re-verified all checks.` : `Routed to adjudicator (${r.lane}). ${(r.reasons || []).join(' ')}`;
    default: return '';
  }
}

export default function ClaimWorkspace({ claim, total, clauses, policy }) {
  const [events, setEvents] = useState([]);
  const [running, setRunning] = useState(false);
  const [snap, setSnap] = useState(null);
  const [paused, setPaused] = useState(null);
  const [final, setFinal] = useState(null);
  const [mode, setMode] = useState(null);
  const [openDoc, setOpenDoc] = useState(null);
  const [fetchedText, setFetchedText] = useState({});
  const [t0, setT0] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const traceRef = useRef(null);

  useEffect(() => {
    if (!running || !t0) return;
    const i = setInterval(() => setElapsed(Date.now() - t0), 200);
    return () => clearInterval(i);
  }, [running, t0]);
  useEffect(() => { if (traceRef.current) traceRef.current.scrollTop = traceRef.current.scrollHeight; }, [events]);

  async function start(resume) {
    setRunning(true);
    if (!resume) { setEvents([]); setSnap(null); setFinal(null); setFetchedText({}); setT0(Date.now()); setElapsed(0); }
    setPaused(null);
    let res;
    try {
      res = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claimId: claim.id, resume, stepsSoFar: resume ? events.filter(x => x.type === 'tool_call').length : 0 }) });
    } catch (e) {
      setEvents(ev => [...ev, { type: 'error', text: 'Network error: ' + e.message }]); setRunning(false); return;
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
    setRunning(false);
  }

  function handle(e) {
    if (e.type === 'start') setMode({ mode: e.mode, model: e.model });
    if (e.state) setSnap(e.state);
    if (e.type === 'tool_result' && e.name === 'search_hospital_records' && e.result.attached) {
      setFetchedText(m => ({ ...m, [e.result.attached.id]: e.result.attached.text }));
    }
    if (e.type === 'paused') { setPaused(e); setRunning(false); }
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
    const resume = { ...paused.resume, approval: { line_id: paused.approval.line_id, decision } };
    start(resume);
  }

  const bill = snap ? snap.bill : claim.bill;
  const evidence = snap ? Object.fromEntries(snap.evidence.map(e => [e.line, e])) : {};
  const removed = snap ? snap.removedLines : [];
  const docs = snap ? snap.documents : claim.documents.map(d => ({ ...d, fetched: false }));
  const chip = decisionChip(final && final.decision);
  const d = final && final.decision;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <a href="/desk" className="small">← Desk queue</a>
          <h1 style={{ marginTop: 4 }}>{claim.patient.name} <span className="muted" style={{ fontSize: 18 }}>· {claim.id}</span></h1>
          <div className="muted">{claim.patient.age} {claim.patient.gender} · {claim.diagnosis} ({claim.icd}) · {claim.procedure} · Admitted {claim.admission}, discharge advised {claim.discharge}</div>
        </div>
        <div className="row" style={{ alignItems: 'center' }}>
          <span className={`chip ${chip.cls}`}>{chip.label}</span>
          <button className="btn terra" disabled={running || !!paused} onClick={() => start(null)}>
            {running ? <><span className="pulse" /> Agent working… {secs(elapsed)}</> : events.length ? 'Run agent again' : 'Run ClaimReady agent ▶'}
          </button>
        </div>
      </div>

      <div className="grid2">
        {/* LEFT: the file */}
        <div>
          <div className="card">
            <div className="eyebrow">Claim file</div>
            <div className="kv" style={{ marginBottom: 12 }}>
              <div>Insurer / policy</div><div>{policy.insurer} · {policy.product} · SI {inr(policy.sumInsured)}</div>
              <div>Policy since</div><div>{claim.policyStart}</div>
              <div>Room</div><div>{claim.room.category} · {inr(claim.room.ratePerDay)}/day × {claim.room.days}{claim.icu ? ` · ICU ${inr(claim.icu.ratePerDay)}/day × ${claim.icu.days}` : ''}</div>
              <div>Pre-auth approved</div><div>{inr(claim.preauthAmount)}</div>
              <div>Desk note</div><div>{claim.deskNote}</div>
            </div>
            <h3 style={{ marginBottom: 6 }}>Bill lines</h3>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Line</th><th>Code</th><th>Description</th><th className="num">Amount</th><th>Evidence</th></tr></thead>
                <tbody>
                  {bill.map(l => {
                    const ev = evidence[l.id];
                    const orig = claim.bill.find(x => x.id === l.id);
                    const changed = orig && orig.code !== l.code;
                    return (
                      <tr key={l.id}>
                        <td>{l.id}</td>
                        <td>{changed && <div className="strike small">{orig.code}</div>}<span className="code">{l.code}</span></td>
                        <td>{l.desc}</td>
                        <td className="num">{inr(l.amount)}</td>
                        <td>{!ev ? <span className="chip new">not checked</span> : ev.linked ? <span className="chip good" title={ev.evidence.join(', ')}>linked</span> : <span className="chip bad" title={ev.missing.join(', ')}>missing {ev.missing.join(', ')}</span>}</td>
                      </tr>
                    );
                  })}
                  {removed.map(l => (
                    <tr key={'r' + l.id}><td className="strike">{l.id}</td><td><span className="code strike">{l.code}</span></td><td className="strike">{l.desc}<div className="small" style={{ color: 'var(--terra)', textDecoration: 'none' }}>removed with desk approval</div></td><td className="num strike">{inr(l.amount)}</td><td></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {snap && (
              <div className="kv" style={{ marginTop: 12 }}>
                <div>Claimed</div><div>{inr(snap.financials.claimed)}</div>
                <div>Admissible</div><div><b>{inr(snap.financials.admissible)}</b></div>
                <div>Patient pays</div><div>{inr(snap.financials.patientPayable)}{snap.financials.copay ? ` (incl. co-pay ${inr(snap.financials.copay)})` : ''}</div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="eyebrow">Documents</div>
            {docs.map(doc => {
              const full = claim.documents.find(x => x.id === doc.id);
              const text = full ? full.text : fetchedText[doc.id];
              return (
                <div key={doc.id}>
                  <button className="docbtn" onClick={() => setOpenDoc(openDoc === doc.id ? null : doc.id)}>
                    <span>{doc.title}</span>
                    {doc.fetched ? <span className="chip info">fetched by agent</span> : <span className="small muted">{doc.type}</span>}
                  </button>
                  {openDoc === doc.id && <div className="doctext">{text || 'Text not available.'}{doc.source ? <div className="small muted" style={{ marginTop: 6 }}>Source: {doc.source}</div> : null}</div>}
                </div>
              );
            })}
          </div>

          {snap && (
            <div className="card">
              <div className="eyebrow">Policy checks (rules engine)</div>
              <table>
                <tbody>
                  {snap.checks.map((c, i) => (
                    <tr key={i}>
                      <td style={{ width: 70 }}><span className={`chip ${c.status === 'pass' ? 'good' : c.status === 'warn' ? 'warn' : 'bad'}`}>{c.status}</span></td>
                      <td><b>{c.clause}</b> {clauses[c.clause] ? clauses[c.clause].title : ''}<div className="small muted">{c.detail}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT: the agent */}
        <div>
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div className="eyebrow">Agent trace</div>
                <h2>What ClaimReady is doing</h2>
              </div>
              {mode && <span className={`chip ${mode.mode === 'llm' ? 'info' : 'warn'}`}>{mode.mode === 'llm' ? `LLM agent · ${mode.model}` : 'Fallback planner (no LLM)'}</span>}
            </div>
            {!events.length && !running && <p className="muted">Press <b>Run ClaimReady agent</b>. Each step below is a real tool call: the agent plans, calls tools, reads results and decides what to do next.</p>}
            <div className="trace" ref={traceRef}>
              {events.map((e, i) => {
                if (e.type === 'thought') return <div key={i} className="thought">{e.text}</div>;
                if (e.type === 'notice') return <div key={i} className="notice small">{e.text}</div>;
                if (e.type === 'human') return <div key={i} className="human">👤 {e.text}</div>;
                if (e.type === 'error') return <div key={i} className="notice">Error: {e.text}</div>;
                if (e.type === 'paused') return null;
                if (e.type === 'tool_call') {
                  const done = events.slice(i + 1).some(x => x.type === 'tool_result' && x.name === e.name);
                  if (done) return null;
                  const [stage, label] = TOOL_LABEL[e.name] || [e.name, ''];
                  return <div key={i} className="step"><div className="head"><span><span className="tool">{stage}</span> · {label}</span><span className="pulse" /></div></div>;
                }
                if (e.type === 'tool_result') {
                  const [stage, label, kind] = TOOL_LABEL[e.name] || [e.name, '', 'check'];
                  return (
                    <div key={i} className={`step icon-${kind}`}>
                      <div className="head"><span><span className="tool">{stage}</span> · {label}</span><span className="ms"><span className="code">{e.name}</span> {secs(e.ms)}</span></div>
                      <div className="res">{summarize(e.name, e.args, e.result)}</div>
                      <details><summary>Tool input and output</summary><pre>{JSON.stringify({ input: e.args, output: e.result }, null, 2)}</pre></details>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            {paused && (
              <div className="approval" style={{ marginTop: 12 }}>
                <div className="eyebrow">Needs your approval · money changes</div>
                <h3>Remove {paused.approval.line_id}: {paused.approval.desc} ({inr(paused.approval.amount)})?</h3>
                <p className="small" style={{ margin: '6px 0 12px' }}>{paused.approval.reason}</p>
                <div className="row">
                  <button className="btn good" onClick={() => decide('approve')}>Approve removal</button>
                  <button className="btn bad" onClick={() => decide('reject')}>Reject</button>
                </div>
              </div>
            )}

            {d && (
              <div className={`decision ${d.status === 'AUTO_APPROVED' ? 'good' : d.lane === 'flagged' ? 'flag' : 'review'}`} style={{ marginTop: 12 }}>
                <div className="eyebrow" style={{ color: 'inherit' }}>Insurer decision · re-verified independently</div>
                <div className="big">{d.status === 'AUTO_APPROVED' ? `Auto-approved ${inr(d.approvedAmount)}` : d.lane === 'flagged' ? 'Flagged for adjudicator' : 'Clean, sent to adjudicator'}</div>
                <div style={{ marginTop: 6 }}>
                  {d.status === 'AUTO_APPROVED' && <>Decided in <b>{secs(d.decisionMs)}</b> after submission · whole run {secs(elapsed)} · patient pays {inr(d.patientPayable)}</>}
                  {d.status !== 'AUTO_APPROVED' && <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>{(d.reasons || []).map((r, i) => <li key={i} className="small">{r}</li>)}</ul>}
                </div>
                <div className="small muted" style={{ marginTop: 6 }}>{d.note}</div>
                {final.summary && <div style={{ marginTop: 10 }}><b>Agent summary for the desk:</b> {final.summary}</div>}
              </div>
            )}

            {snap && snap.deskMessages.length > 0 && (
              <div className="card" style={{ marginTop: 12, background: '#fff' }}>
                <div className="eyebrow">Messages to the desk</div>
                {snap.deskMessages.map((m, i) => <p key={i} style={{ margin: '4px 0' }}>{m.message}</p>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
