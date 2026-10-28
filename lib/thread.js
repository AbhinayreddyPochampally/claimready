// Hospital <-> insurer conversation per claim. Stored as rows in the same `runs` table with mode = 'thread'
// (CR_STORE=memory keeps them in this server process only).
import { createClient } from '@supabase/supabase-js';
const MEMORY = process.env.CR_STORE === 'memory';
const mem = globalThis.__crThread || (globalThis.__crThread = []);
function client() {
  const url = process.env.SUPABASE_URL || 'https://ahyerosypdjtszjzkexv.supabase.co';
  const key = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeWVyb3N5cGRqdHN6anprZXh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5Mjc1MTYsImV4cCI6MjEwODUwMzUxNn0._IsO15HCcVO9oAzd48BtN9jE56HWgKjJibL4du9LuLQ';
  return createClient(url, key, { auth: { persistSession: false } });
}
// event: { claim_id, patient, actor: 'hospital'|'insurer_ai'|'insurer_officer', kind, message, items: [], docs: [] }
export async function addEvent(ev) {
  const row = { claim_id: ev.claim_id, patient: ev.patient || null, mode: 'thread', model: ev.actor, status: ev.kind, summary: ev.message || '', reasons: ev.items || [], packet: { docs: ev.docs || [], amount: ev.amount ?? null }, steps: 0 };
  if (MEMORY) { mem.push({ id: mem.length + 1, created_at: new Date().toISOString(), ...row }); return true; }
  const { error } = await client().from('runs').insert(row);
  if (error) console.error('addEvent', error.message);
  return !error;
}
export async function listThread(claimId) {
  let rows;
  if (MEMORY) rows = mem.filter(r => r.claim_id === claimId);
  else {
    const { data, error } = await client().from('runs').select('id,created_at,claim_id,patient,model,status,summary,reasons,packet').eq('mode', 'thread').eq('claim_id', claimId).order('created_at', { ascending: true }).limit(200);
    if (error) { console.error('listThread', error.message); return []; }
    rows = data;
  }
  return rows.map(r => ({ id: r.id, at: r.created_at, actor: r.model, kind: r.status, message: r.summary, items: r.reasons || [], docs: (r.packet && r.packet.docs) || [], amount: r.packet ? r.packet.amount : null }));
}
export async function latestByClaim() {
  let rows;
  if (MEMORY) rows = mem;
  else {
    const { data, error } = await client().from('runs').select('id,created_at,claim_id,patient,model,status,summary').eq('mode', 'thread').order('created_at', { ascending: false }).limit(300);
    if (error) return {};
    rows = data;
  }
  const out = {};
  for (const r of [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) if (!out[r.claim_id]) out[r.claim_id] = { kind: r.status, actor: r.model, at: r.created_at, message: r.summary };
  return out;
}
