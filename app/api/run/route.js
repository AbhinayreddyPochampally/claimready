import { runAgent } from '@/lib/agent';
import { saveRun } from '@/lib/store';
import { addEvent } from '@/lib/thread';
import { getClaim } from '@/lib/data';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await req.json();
  const { claimId, resume, stepsSoFar, runMsSoFar } = body;
  const claim = getClaim(claimId);
  if (!claim) return new Response(JSON.stringify({ error: 'Unknown claim' }), { status: 404 });

  const encoder = new TextEncoder();
  let steps = Number(stepsSoFar) || 0;
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e) => {
        if (e.type === 'tool_call') steps += 1;
        controller.enqueue(encoder.encode(JSON.stringify({ ...e, t: Date.now() }) + '\n'));
      };
      try {
        const out = await runAgent({ claimId, resume, emit });
        if (out && out.type === 'final' && out.decision) {
          const d = out.decision;
          await saveRun({
            claim_id: claimId, patient: claim.patient.name, mode: out.mode,
            model: out.mode === 'llm' ? (out.model || process.env.OPENAI_MODEL || 'gpt-4.1-mini') : 'deterministic planner',
            status: d.status, lane: d.lane || null,
            approved_amount: d.approvedAmount ?? null, patient_payable: d.financials ? d.financials.patientPayable : null,
            decision_ms: d.decisionMs ?? null, reasons: d.reasons || [], summary: out.summary,
            steps, packet: { ...out.state, runMs: (out.runMs || 0) + (Number(runMsSoFar) || 0), recheckMs: d.recheckMs ?? null, simulatedMs: d.simulatedMs ?? null, fallbackReason: out.mode === 'fallback' ? out.reason : null }
          });
          const rs = n => 'Rs ' + Math.round(n || 0).toLocaleString('en-IN');
          const base = { claim_id: claimId, patient: claim.patient.name };
          await addEvent({ ...base, actor: 'hospital', kind: 'SUBMITTED', message: `Claim packet submitted: ${rs(d.financials ? d.financials.claimed : 0)} claimed, ${rs(d.financials ? d.financials.admissible : 0)} admissible after policy rules.` });
          if (d.status === 'AUTO_APPROVED') {
            await addEvent({ ...base, actor: 'insurer_ai', kind: 'APPROVED', message: `Auto-approved ${rs(d.approvedAmount)} under fast-lane rule FL-1 after the insurer's automated re-check of every rule, evidence link and document.`, amount: d.approvedAmount });
          } else {
            const rec = d.lane === 'flagged'
              ? 'Recommendation from the automated re-check: ask the hospital for evidence on the issues below; refer to the claims committee if they cannot be supported.'
              : `Recommendation from the automated re-check: approve ${rs(d.financials ? d.financials.admissible : 0)}. The file is clean but above the Rs 75,000 auto-approval limit, so an officer must sign off.`;
            await addEvent({ ...base, actor: 'insurer_ai', kind: 'AI_REVIEW', message: rec, items: d.reasons || [], amount: d.financials ? d.financials.admissible : null });
          }
        }
      } catch (err) {
        emit({ type: 'error', text: String(err.message || err) });
      }
      controller.close();
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } });
}
