'use client';
import { useEffect, useState } from 'react';
import { inr, when } from './format';

const WHO = { hospital: 'Hospital desk', insurer_ai: 'Insurer, automated check', insurer_officer: 'Insurer officer' };
const KIND = {
  SUBMITTED: ['Submitted', 'info'], AI_REVIEW: ['Recommendation', 'hold'], QUERY: ['Documents requested', 'gate'],
  DOCS_UPLOADED: ['Documents sent', 'info'], APPROVED: ['Approved', 'ok'], REJECTED: ['Rejected', 'flag'],
  NOTE: ['Note', 'none'], HUMAN_HELP: ['Person requested', 'gate']
};
export const DOC_TYPES = ['Itemised pharmacy bill', 'ICU notes', 'Investigation report', 'Doctor’s order for the test', 'Operative note', 'Discharge summary', 'Final bill', 'Implant invoice', 'Other'];

export function useThread(claimId, refreshKey) {
  const [events, setEvents] = useState(null);
  const load = () => fetch(`/api/thread?claimId=${claimId}`, { cache: 'no-store' }).then(r => r.json()).then(d => setEvents(d.events || [])).catch(() => setEvents([]));
  useEffect(() => { load(); const i = setInterval(load, 6000); return () => clearInterval(i); }, [claimId, refreshKey]);
  return [events, setEvents, load];
}

export function status(events) {
  if (!events || !events.length) return null;
  const real = events.filter(e => e.kind !== 'NOTE' && e.kind !== 'HUMAN_HELP');
  if (!real.length) return null;
  const final = [...real].reverse().find(e => e.kind === 'APPROVED' || e.kind === 'REJECTED');
  const last = real[real.length - 1];
  if (final && new Date(final.at) >= new Date(last.at)) return final.kind;
  return last.kind;
}

export function ThreadList({ events }) {
  if (!events) return <p className="muted small">Loading the conversation.</p>;
  if (!events.length) return <p className="muted small">No messages yet. The conversation starts when the hospital submits the claim.</p>;
  return (
    <ol className="thread">
      {events.map(e => {
        const [label, cls] = KIND[e.kind] || [e.kind, 'none'];
        return (
          <li key={e.id} className={`t-${e.actor}`}>
            <div className="t-head"><b>{WHO[e.actor] || e.actor}</b><span className={`pill ${cls}`}>{label}</span><span className="muted small">{when(e.at)}</span></div>
            <div className="t-body">{e.message}</div>
            {e.items && e.items.length > 0 && <ul className="t-items">{e.items.map((x, i) => <li key={i}>{x}</li>)}</ul>}
            {e.docs && e.docs.length > 0 && <ul className="t-items">{e.docs.map((x, i) => <li key={i}><b>{x.docType}</b>: {x.name} ({Math.max(1, Math.round(x.size / 1024))} KB)</li>)}</ul>}
          </li>
        );
      })}
    </ol>
  );
}

export function HospitalReply({ claimId, events, onDone }) {
  const lastQuery = events ? [...events].reverse().find(e => e.kind === 'QUERY') : null;
  const [files, setFiles] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const asked = lastQuery ? lastQuery.items : [];
  const options = [...new Set([...asked, ...DOC_TYPES])];
  async function send() {
    setErr('');
    if (!files.length) { setErr('Attach at least one file.'); return; }
    setBusy(true);
    const r = await fetch('/api/thread', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claimId, action: 'hospital_upload', message: note, docs: files.map(f => ({ name: f.file.name, size: f.file.size, docType: f.docType })) }) }).then(x => x.json());
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setFiles([]); setNote(''); onDone(r.events);
  }
  return (
    <div className="reply">
      <h3>Reply to the insurer</h3>
      {asked.length > 0 && <p className="small">The insurer asked for: <b>{asked.join(', ')}</b></p>}
      <label className="small" htmlFor={`up-${claimId}`}>Attach files (PDF or image)</label>
      <input id={`up-${claimId}`} type="file" multiple accept=".pdf,image/*" onChange={e => setFiles([...e.target.files].map((f, i) => ({ file: f, docType: asked[i] || asked[0] || 'Other' })))} />
      {files.map((f, i) => (
        <div key={i} className="file-row">
          <span className="small">{f.file.name}</span>
          <select aria-label={`Document type for ${f.file.name}`} value={f.docType} onChange={e => setFiles(fs => fs.map((x, j) => j === i ? { ...x, docType: e.target.value } : x))}>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      ))}
      <textarea placeholder="Note to the insurer (optional)" value={note} onChange={e => setNote(e.target.value)} rows={2} />
      {err && <p className="sys">{err}</p>}
      <button className="btn" disabled={busy} onClick={send}>{busy ? 'Sending' : 'Send documents to the insurer'}</button>
      <p className="small muted" style={{ marginTop: 6 }}>Demo: the insurer receives the file name, size and type you choose. Reading scanned files with AI is planned for the pilot.</p>
    </div>
  );
}

export function OfficerDecision({ claimId, events, suggestedAmount, onDone }) {
  const rec = events ? [...events].reverse().find(e => e.actor === 'insurer_ai') : null;
  const [mode, setMode] = useState(null);
  const [amount, setAmount] = useState(suggestedAmount || '');
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(decision) {
    setErr(''); setBusy(true);
    const r = await fetch('/api/thread', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claimId, action: 'officer_decide', decision, message: msg, items, amount: Number(amount) || null }) }).then(x => x.json());
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setMode(null); setMsg(''); setItems([]); onDone(r.events);
  }
  return (
    <div className="reply">
      <h3>Officer decision</h3>
      {rec && <p className="small"><b>Latest automated recommendation:</b> {rec.message}</p>}
      <div className="btns">
        <button className="btn ok" onClick={() => setMode('APPROVED')}>Approve</button>
        <button className="btn ghost" onClick={() => setMode('QUERY')}>Ask for documents</button>
        <button className="btn no" onClick={() => setMode('REJECTED')}>Reject</button>
      </div>
      {mode === 'APPROVED' && <div className="form"><label className="small">Amount to approve (Rs)<input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></label><button className="btn ok" disabled={busy} onClick={() => go('APPROVED')}>Confirm approval of {inr(Number(amount))}</button></div>}
      {mode === 'QUERY' && <div className="form">
        <p className="small">Tick what the hospital must send:</p>
        {DOC_TYPES.filter(t => t !== 'Other').map(t => <label key={t} className="small chk"><input type="checkbox" checked={items.includes(t)} onChange={e => setItems(x => e.target.checked ? [...x, t] : x.filter(y => y !== t))} /> {t}</label>)}
        <textarea placeholder="Message to the hospital" value={msg} onChange={e => setMsg(e.target.value)} rows={2} />
        <button className="btn" disabled={busy} onClick={() => go('QUERY')}>Send query to the hospital</button></div>}
      {mode === 'REJECTED' && <div className="form">
        <p className="small">A rejection is recorded as a claims review committee decision and needs a written reason with the policy clause.</p>
        <textarea placeholder="Reason and clause, for example: C4.2 waiting period not met" value={msg} onChange={e => setMsg(e.target.value)} rows={2} />
        <button className="btn no" disabled={busy} onClick={() => go('REJECTED')}>Record rejection</button></div>}
      {err && <p className="sys" style={{ marginTop: 8 }}>{err}</p>}
    </div>
  );
}

export function NoteBox({ claimId, actor, onDone, defaultHuman = false }) {
  const [text, setText] = useState('');
  const [human, setHuman] = useState(defaultHuman);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const other = actor === 'hospital' ? 'insurer' : 'hospital desk';
  async function send() {
    setErr(''); setBusy(true);
    const r = await fetch('/api/thread', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claimId, action: 'note', actor, human, message: text }) }).then(x => x.json()).catch(() => ({ error: 'Could not send. Check your connection and try again.' }));
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setText(''); setHuman(false); onDone(r.events);
  }
  return (
    <div className="reply note-box">
      <h3>Notes and help from a person</h3>
      <textarea rows={2} value={text} onChange={e => setText(e.target.value)} placeholder={`Note to the ${other}, for example a clarification or context the agent cannot see`} />
      <label className="small chk"><input type="checkbox" checked={human} onChange={e => setHuman(e.target.checked)} /> Ask for a person on the {other} side to call back (use this when the agent fails or the case needs discussion)</label>
      {err && <p className="sys">{err}</p>}
      <button className="btn ghost" disabled={busy || !text.trim()} onClick={send}>{human ? 'Send and request a person' : 'Add note'}</button>
    </div>
  );
}
