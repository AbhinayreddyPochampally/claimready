'use client';
import { useEffect, useState } from 'react';
import { inr, decisionChip } from './format';

export default function DeskQueue({ rows }) {
  const [status, setStatus] = useState({});
  useEffect(() => {
    try { setStatus(JSON.parse(localStorage.getItem('cr-status') || '{}')); } catch { setStatus({}); }
  }, []);
  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
      <table>
        <thead><tr><th>Claim</th><th>Patient</th><th>Diagnosis / procedure</th><th className="num">Bill</th><th>Desk note</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map(r => {
            const chip = decisionChip(status[r.id]);
            return (
              <tr key={r.id}>
                <td><span className="code">{r.id}</span></td>
                <td><b>{r.patient.name}</b><div className="small muted">{r.patient.age} {r.patient.gender}</div></td>
                <td>{r.diagnosis}<div className="small muted">{r.procedure}</div></td>
                <td className="num">{inr(r.amount)}</td>
                <td className="small">{r.deskNote}</td>
                <td><span className={`chip ${chip.cls}`}>{chip.label}</span></td>
                <td><a className="btn secondary" href={`/claim/${r.id}`}>Open →</a></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
