import { createClient } from '@supabase/supabase-js';

function client() {
  // Public demo project; the anon key is safe to ship (row-level security limits it to the runs table).
  const url = process.env.SUPABASE_URL || 'https://ahyerosypdjtszjzkexv.supabase.co';
  const key = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeWVyb3N5cGRqdHN6anprZXh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5Mjc1MTYsImV4cCI6MjEwODUwMzUxNn0._IsO15HCcVO9oAzd48BtN9jE56HWgKjJibL4du9LuLQ';
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function saveRun(run) {
  const sb = client();
  if (!sb) return null;
  const { error } = await sb.from('runs').insert(run);
  if (error) console.error('saveRun', error.message);
  return !error;
}

export async function listRuns(limit = 40) {
  const sb = client();
  if (!sb) return [];
  const { data, error } = await sb.from('runs').select('id,created_at,claim_id,patient,mode,model,status,lane,approved_amount,patient_payable,decision_ms,reasons,summary,steps').order('created_at', { ascending: false }).limit(limit);
  if (error) { console.error('listRuns', error.message); return []; }
  return data;
}
