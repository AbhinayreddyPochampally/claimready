'use client';
import { useEffect, useState, Fragment } from 'react';
import { inr, secs, decisionChip, ago, when } from './format';

function Row({ r, older, open, toggle, superseded }) {
  const chip = decisionChip({ status: r.status, lane: r.lane });
  const llm = r.mode === 'llm';
  const reasons = r.reasons || [];
  return (
    <tr className={superseded ? 'old' : ''}>
      <td className="small"><b>{ago(r.created_at)}</b><div className="muted">{when(r.created_at)}</div>{superseded && <span className="pill none" style={{ marginTop: 4 }}>Superseded</span>}{older > 0 && <button className="linkbtn" aria-expanded={open} onClick={toggle}>{open ? 'Hide' : 'Show'} {older} earlier run{older > 1 ? 's' : ''}</button>}</td>
      <td><a href={`/claim/${r.claim_id}`}><span className="code">{r.claim_id}</span></a><div className="small">{r.patient}</div>{!superseded && <a className="btn ghost" style={{ marginTop: 6, padding: '4px 10px', fontSize: 13 }} href={`/insurer/${r.claim_id}`}>Review</a>}</td>
      <td><span className={`pill ${chip.cls}`}>{chip.label}</span></td>
      <td className="num">{r.approved_amount == null ? <span className="muted small">Awaits review</span> : inr(r.approved_amount)}</td>
      <td className="num">{inr(r.patient_payable)}</td>
      <td className="small"><span className={`pill ${llm ? 'info' : 'hold'}`}>{llm ? `LLM, ${r.model}` : 'Deterministic fallback'}</span><div className="muted" style={{ marginTop: 3 }}>{r.steps} tool calls{r.run_ms ? `, ${secs(Number(r.run_ms))} agent time` : ''}</div></td>
      <td className="num small">{secs(r.decision_ms)}<div className="muted">simulated</div></td>
      <td className="small" style={{ maxWidth: 360 }}>{reasons.length ? <>{reasons.slice(0, 3).map((x, i) => <div key={i}>{x}</div>)}{reasons.length > 3 && <div className="muted">+{reasons.length - 3} more on the claim page</div>}</> : <span className="muted">Every check re-verified; fast-lane rule FL-1</span>}</td>
    </tr>
  );
}

const HEAD = <thead><tr><th>Received</th><th>Claim</th><th>Decision</th><th className="num">Approved</th><th className="num">Patient pays</th><th>Planner</th><th className="num">Insurer decision time</th><th>Reasons</th></tr></thead>;

export default function InsurerInbox() {
  const [runs, setRuns] = useState(null);
  const [store, setStore] = useState('database');
  const [openClaims, setOpenClaims] = useState({});
  const load = () => fetch('/api/runs', { cache: 'no-store' }).then(r => r.json()).then(d => { setRuns(d.runs || []); setStore(d.store || 'database'); }).catch(() => setRuns([]));
  useEffect(() => { load(); const i = setInterval(load, 8000); return () => clearInterval(i); }, []);
  if (runs === null) return <p className="muted">Loading packets.</p>;
  const latest = [];
  const seen = new Set();
  for (const r of runs) { if (!seen.has(r.claim_id)) { seen.add(r.claim_id); latest.push(r); } }
  const older = runs.filter(r => !latest.includes(r));
  const auto = latest.filter(r => r.status === 'AUTO_APPROVED').length;
  const llmRuns = runs.filter(r => r.mode === 'llm').length;
  return (
    <div>
      <div className="panel inbox-sum">
        <div><b>{latest.length}</b><span>claims with a packet (latest run each)</span></div>
        <div><b>{auto}</b><span>auto-approved on arrival, of those</span></div>
        <div><b>{latest.length - auto}</b><span>sent to an adjudicator, with reasons</span></div>
        <div><b>{llmRuns} of {runs.length}</b><span>runs planned by the LLM; the rest by the fallback</span></div>
      </div>
      {store === 'memory' && <p className="sys" style={{ marginBottom: 12 }}>Local test mode: packets are kept in memory on this server only.</p>}
      <section className="panel">
        <header><h2>Latest packet for each claim</h2><span className="sect-note">Refreshes every 8 seconds</span></header>
        <div style={{ overflowX: 'auto' }}>
          <table>{HEAD}<tbody>
            {latest.length === 0 && <tr><td colSpan={8} className="empty">No packets yet. Open a claim from the discharge queue and run the agent; its packet appears here.</td></tr>}
            {latest.map(r => {
              const hist = older.filter(o => o.claim_id === r.claim_id);
              const open = !!openClaims[r.claim_id];
              return (
                <Fragment key={r.id}>
                  <Row r={r} older={hist.length} open={open} toggle={() => setOpenClaims(m => ({ ...m, [r.claim_id]: !open }))} />
                  {open && hist.map(h => <Row key={h.id} r={h} superseded />)}
                </Fragment>
              );
            })}
          </tbody></table>
        </div>
      </section>
    </div>
  );
}
