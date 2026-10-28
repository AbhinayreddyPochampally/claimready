import { addEvent, listThread, latestByClaim } from '@/lib/thread';
import { getClaim } from '@/lib/data';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const id = new URL(req.url).searchParams.get('claimId');
  if (!id) return Response.json({ latest: await latestByClaim() });
  return Response.json({ events: await listThread(id) });
}

const rs = n => 'Rs ' + Math.round(n || 0).toLocaleString('en-IN');

export async function POST(req) {
  const b = await req.json();
  const claim = getClaim(b.claimId);
  if (!claim) return Response.json({ error: 'Unknown claim' }, { status: 404 });
  const base = { claim_id: claim.id, patient: claim.patient.name };
  if (b.action === 'officer_decide') {
    const d = b.decision;
    if (!['APPROVED', 'QUERY', 'REJECTED'].includes(d)) return Response.json({ error: 'Bad decision' }, { status: 400 });
    if (d === 'REJECTED' && !(b.message || '').trim()) return Response.json({ error: 'A rejection needs a written reason.' }, { status: 400 });
    if (d === 'QUERY' && !(b.items || []).length && !(b.message || '').trim()) return Response.json({ error: 'Say what the hospital should send.' }, { status: 400 });
    const msg = d === 'APPROVED' ? `Approved ${rs(b.amount)} by the insurer's medical officer.${b.message ? ' ' + b.message : ''}`
      : d === 'QUERY' ? (b.message || 'Please send the documents listed.')
      : `Rejected by the claims review committee: ${b.message}`;
    await addEvent({ ...base, actor: 'insurer_officer', kind: d, message: msg, items: b.items || [], amount: b.amount ?? null });
    return Response.json({ ok: true, events: await listThread(claim.id) });
  }
  if (b.action === 'hospital_upload') {
    const docs = (b.docs || []).slice(0, 10).map(x => ({ name: String(x.name).slice(0, 120), size: Number(x.size) || 0, docType: String(x.docType || 'Other').slice(0, 60) }));
    if (!docs.length) return Response.json({ error: 'Attach at least one file.' }, { status: 400 });
    await addEvent({ ...base, actor: 'hospital', kind: 'DOCS_UPLOADED', message: b.message || `Sent ${docs.length} document(s).`, docs });
    const events = await listThread(claim.id);
    const lastQuery = [...events].reverse().find(e => e.kind === 'QUERY');
    const asked = lastQuery ? lastQuery.items : [];
    const sentTypes = new Set(events.filter(e => e.kind === 'DOCS_UPLOADED' && (!lastQuery || new Date(e.at) >= new Date(lastQuery.at))).flatMap(e => e.docs.map(x => x.docType)));
    const missing = asked.filter(a => !sentTypes.has(a));
    const rec = missing.length
      ? { kind: 'AI_REVIEW', message: `Automated check: still missing ${missing.join(', ')}. Recommendation: send another query for the missing items.`, items: missing }
      : { kind: 'AI_REVIEW', message: `Automated check: every requested item has been received (${[...sentTypes].join(', ')}). Recommendation: the officer reviews the files and decides. File contents are not read in this demo.`, items: [] };
    await addEvent({ ...base, actor: 'insurer_ai', ...rec });
    return Response.json({ ok: true, events: await listThread(claim.id) });
  }
  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
