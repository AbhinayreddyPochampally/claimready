import { runAgent } from '@/lib/agent';
import { saveRun } from '@/lib/store';
import { getClaim } from '@/lib/data';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await req.json();
  const { claimId, resume, stepsSoFar } = body;
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
            model: out.mode === 'llm' ? (process.env.OPENAI_MODEL || 'gpt-4.1-mini') : 'rule-based planner',
            status: d.status, lane: d.lane || null,
            approved_amount: d.approvedAmount ?? null, patient_payable: d.financials ? d.financials.patientPayable : null,
            decision_ms: d.decisionMs ?? null, reasons: d.reasons || [], summary: out.summary,
            steps, packet: out.state
          });
        }
      } catch (err) {
        emit({ type: 'error', text: String(err.message || err) });
      }
      controller.close();
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } });
}
