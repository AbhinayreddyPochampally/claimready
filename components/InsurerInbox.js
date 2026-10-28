'use client';
import { useEffect, useState } from 'react';
import { inr, secs, decisionChip } from './format';

export default function InsurerInbox() {
  const [runs, setRuns] = useState(null);
  const [configured, setConfigured] = useState(true);
  const load = () => fetch('/api/runs', { cache: 'no-store' }).then(r => r.json()).then(d => { setRuns(d.runs || []); setConfigured(d.configured); }).catch(() => setRuns([]));
  useEffect(() => { load(); const i = setInterval(load, 8000); return () => clearInterval(i); }, []);
  if (runs === null) return <p className="muted">Loading…</p>;
  const auto = runs.filter(r => r.status === 'AUTO_APPROVED');
  const fastMs = auto.map(r => r.decision_ms).filter(Boolean);
  const avg = fastMs.length ? Math.round(fastMs.reduce((a, b) => a + b, 0) / fastMs.length) : null;
  return (
    <div>
      <div className="grid3" style={{ margin: '14px 0' }}>
        <div className="stat"><b>{runs.length}</b>packets received</div>
        <div className="stat"><b>{runs.length ? Math.round(auto.length / runs.length * 100) : 0}%</b>auto-approved on arrival</div>
        <div className="stat"><b>{secs(avg)}</b>average decision time for auto-approved claims</div>
      </div>
      {!configured && <p className="notice">Database not configured; history is not stored.</p>}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Received</th><th>Claim</th><th>Decision</th><th className="num">Approved</th><th className="num">Patient pays</th><th className="num">Decision time</th><th>Why</th><th>Agent</th></tr></thead>
          <tbody>
            {runs.length === 0 && <tr><td colSpan={8} className="muted">No packets yet. Run the agent on a claim from the desk queue.</td></tr>}
            {runs.map(r => {
              const chip = decisionChip({ status: r.status, lane: r.lane });
              return (
                <tr key={r.id}>
                  <td className="small">{new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td><a href={`/claim/${r.claim_id}`}><span className="code">{r.claim_id}</span></a><div className="small">{r.patient}</div></td>
                  <td><span className={`chip ${chip.cls}`}>{chip.label}</span></td>
                  <td className="num">{inr(r.approved_amount)}</td>
                  <td className="num">{inr(r.patient_payable)}</td>
                  <td className="num">{secs(r.decision_ms)}</td>
                  <td className="small" style={{ maxWidth: 380 }}>{(r.reasons || []).length ? r.reasons.map((x, i) => <div key={i}>• {x}</div>) : <span className="muted">All checks re-verified; fast lane</span>}</td>
                  <td className="small">{r.steps} tool calls<div className="muted">{r.model}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
