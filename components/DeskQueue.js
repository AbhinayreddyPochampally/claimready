'use client';
import { useEffect, useState } from 'react';
import { inr, decisionChip } from './format';

export default function DeskQueue({ rows }) {
  const [status, setStatus] = useState({});
  useEffect(() => {
    let local = {};
    try { local = JSON.parse(localStorage.getItem('cr-status') || '{}'); } catch {}
    setStatus(local);
    fetch('/api/runs', { cache: 'no-store' }).then(r => r.json()).then(d => {
      const latest = {};
      for (const r of d.runs || []) if (!latest[r.claim_id]) latest[r.claim_id] = { status: r.status, lane: r.lane };
      setStatus(latest);
    }).catch(() => {});
  }, []);
  return (
    <div className="panel" style={{ overflowX: 'auto' }}>
      <table className="queue">
        <thead><tr><th>Claim and patient</th><th className="num">Bill</th><th>What the agent will meet</th><th>Designed outcome</th><th>Latest result</th><th><span className="sr">Action</span></th></tr></thead>
        <tbody>
          {rows.map(r => {
            const chip = decisionChip(status[r.id]);
            return (
              <tr key={r.id} className={`k-${r.demo.expectKind}`}>
                <td className="who"><b><span className="code">{r.id}</span> {r.patient.name}</b><span className="small muted">{r.patient.age} {r.patient.gender === 'M' ? 'male' : 'female'}, {r.diagnosis.toLowerCase()}</span></td>
                <td className="num amount">{inr(r.amount)}</td>
                <td><div className="issue">{r.demo.issue}</div><div>{r.demo.detail}</div></td>
                <td className="small">{r.demo.expect}</td>
                <td><span className={`pill ${chip.cls}`}>{chip.label}</span></td>
                <td><a className={r.id === 'C-103' ? 'btn' : 'btn ghost'} href={`/claim/${r.id}`}>Open claim</a></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
