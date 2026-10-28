import { createClient } from '@supabase/supabase-js';

// Storage for the insurer inbox.
// CR_STORE=memory keeps runs in this server process only (local testing; nothing is written to the shared demo database).
const MEMORY = process.env.CR_STORE === 'memory';
const mem = globalThis.__crRuns || (globalThis.__crRuns = []);

function client() {
  // Public demo project; the anon key is safe to ship (row-level security limits it to the runs table).
  const url = process.env.SUPABASE_URL || 'https://ahyerosypdjtszjzkexv.supabase.co';
  const key = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeWVyb3N5cGRqdHN6anprZXh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5Mjc1MTYsImV4cCI6MjEwODUwMzUxNn0._IsO15HCcVO9oAzd48BtN9jE56HWgKjJibL4du9LuLQ';
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const storeMode = () => (MEMORY ? 'memory' : 'database');

export async function saveRun(run) {
  if (MEMORY) {
    mem.unshift({ id: mem.length + 1, created_at: new Date().toISOString(), ...run, run_ms: run.packet && run.packet.runMs, recheck_ms: run.packet && run.packet.recheckMs, simulated_ms: run.packet && run.packet.simulatedMs, fallback_reason: run.packet && run.packet.fallbackReason });
    return true;
  }
  const sb = client();
  if (!sb) return null;
  const { error } = await sb.from('runs').insert(run);
  if (error) console.error('saveRun', error.message);
  return !error;
}

export async function listRuns(limit = 60) {
  if (MEMORY) return mem.slice(0, limit);
  const sb = client();
  if (!sb) return [];
  const { data, error } = await sb.from('runs')
    .select('id,created_at,claim_id,patient,mode,model,status,lane,approved_amount,patient_payable,decision_ms,reasons,summary,steps,run_ms:packet->runMs,recheck_ms:packet->recheckMs,simulated_ms:packet->simulatedMs,fallback_reason:packet->fallbackReason')
    .or('mode.is.null,mode.neq.thread').order('created_at', { ascending: false }).limit(limit);
  if (error) { console.error('listRuns', error.message); return []; }
  return data;
}
