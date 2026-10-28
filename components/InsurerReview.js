'use client';
import { useEffect, useState } from 'react';
import { inr, decisionChip, when } from './format';
import { useThread, ThreadList, OfficerDecision, status as threadStatus } from './Thread';

export default function InsurerReview({ claim }) {
  const [thread, setThread] = useThread(claim.id, 0);
  const [run, setRun] = useState(null);
  useEffect(() => { fetch('/api/runs', { cache: 'no-store' }).then(r => r.json()).then(d => setRun((d.runs || []).find(r => r.claim_id === claim.id) || false)).catch(() => setRun(false)); }, [claim.id]);
  const st = threadStatus(thread);
  const chip = run ? decisionChip({ status: run.status, lane: run.lane }) : null;
  const admissible = thread ? ([...thread].reverse().find(e => e.amount != null) || {}).amount : null;
  return (
    <div>
      <div className="page-head"><div>
        <a href="/insurer" className="small">Back to the insurer inbox</a>
        <h1 style={{ marginTop: 6 }}>Insurer review: {claim.patient.name}, claim {claim.id}</h1>
        <p>{claim.diagnosis}, {claim.procedure.toLowerCase()}. Billed {inr(claim.total)}. You are acting as the insurer&apos;s medical officer. The automated check recommends; you decide.</p>
      </div></div>
      <div className="ws">
        <section className="panel">
          <header><h2>Latest packet from the hospital</h2>{chip && <span className={`pill ${chip.cls}`}>{chip.label}</span>}</header>
          <div className="body">
            {run === null && <p className="muted">Loading.</p>}
            {run === false && <p className="muted">No packet yet. Run the agent on this claim from the hospital side first: <a href={`/claim/${claim.id}`}>open claim {claim.id}</a>.</p>}
            {run && <>
              <div className="kv">
                <div>Received</div><div>{when(run.created_at)}</div>
                <div>Approved by rule</div><div>{run.approved_amount == null ? 'Not auto-approved' : inr(run.approved_amount)}</div>
                <div>Patient pays</div><div>{inr(run.patient_payable)}</div>
                <div>Prepared by</div><div>{run.mode === 'llm' ? `LLM planner, ${run.model}` : 'Deterministic fallback planner'}</div>
              </div>
              <h3 style={{ margin: '14px 0 6px' }}>Issues found by the automated re-check</h3>
              {(run.reasons || []).length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{run.reasons.map((r, i) => <li key={i} className="small" style={{ marginBottom: 4 }}>{r}</li>)}</ul> : <p className="small muted">None. Every rule, evidence link and document check passed.</p>}
            </>}
          </div>
        </section>
        <section className="panel">
          <header><h2>Conversation with the hospital</h2><span className="sect-note">{st ? `Status: ${st.replace('_', ' ').toLowerCase()}` : ''}</span></header>
          <div className="body">
            <ThreadList events={thread} />
            {run && st && st !== 'APPROVED' && st !== 'REJECTED' && <OfficerDecision claimId={claim.id} events={thread} suggestedAmount={admissible} onDone={setThread} />}
            {(st === 'APPROVED' || st === 'REJECTED') && <p className="small muted" style={{ marginTop: 10 }}>This claim is closed. Running the agent again on the hospital side starts a new submission.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
