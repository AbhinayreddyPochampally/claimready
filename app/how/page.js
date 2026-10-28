import { POLICY } from '@/lib/policy';
const TOOLS = [
  ['read_claim_file', 'Gather', 'Reads the bill, room, pre-auth and the documents attached.'],
  ['extract_clinical_facts', 'Gather', 'LLM extraction of diagnosis, procedures, ICU days and symptoms from the discharge summary and reports.'],
  ['check_policy', 'Check policy', 'Deterministic rules engine: room-rent cap and proportionate deduction, ICU cap, waiting periods, co-pay, non-payables, package billing, required documents. Every result cites a clause.'],
  ['link_evidence', 'Link evidence', 'Ties each bill line to the record that justifies it; lists what is missing.'],
  ['map_charge_code / apply_code_mapping', 'Fix', 'Maps a hospital code to the insurer package, chosen only from the insurer’s closed package list.'],
  ['search_hospital_records', 'Fix', 'Fetches a missing itemised pharmacy bill, ICU note or report from hospital systems.'],
  ['propose_bill_change', 'Ask desk', 'Any change to money pauses the run until the desk executive approves or rejects.'],
  ['check_duplicate_documents', 'Check', 'Compares report fingerprints with earlier claims to catch reused documents.'],
  ['notify_desk', 'Tell desk', 'Tells the desk what the patient will pay, and why, before discharge.'],
  ['flag_for_review', 'Flag', 'Escalates what cannot be fixed to the insurer’s adjudicator. Never a denial.'],
  ['submit_claim', 'Submit', 'Sends the packet; the insurer re-verifies everything and auto-approves clean claims (rule FL-1).']
];
const AUTONOMY = [
  ['Read, extract, check, link, search records', 'Agent', 'Low risk, logged, reversible'],
  ['Map a code from the insurer’s closed list', 'Agent', 'Amount unchanged; insurer re-checks'],
  ['Remove or change a billed amount', 'Desk executive', 'Money changes need a human'],
  ['Approve a clean claim up to the fast-lane limit', 'Insurer rules (FL-1)', 'Insurer owns the limits'],
  ['Approve a flagged or larger claim', 'Insurer adjudicator', 'Human judgement on the evidence map'],
  ['Deny a claim', 'Claims review committee only', 'IRDAI rule; the agent never denies']
];
export default function How() {
  return (
    <div>
      <div className="eyebrow">Architecture</div>
      <h1>How the ClaimReady agent works</h1>
      <p className="muted" style={{ maxWidth: 860 }}>A language model plans and decides the next step; the tools do the work. Policy rules run as fixed code, so the same claim always gives the same result. The model reads and writes text; it never decides coverage.</p>
      <div className="grid2" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="eyebrow">Tools the agent can call</div>
          <table><tbody>{TOOLS.map(([n, s, d]) => <tr key={n}><td style={{ width: 120 }}><b>{s}</b></td><td><span className="code">{n}</span><div className="small muted">{d}</div></td></tr>)}</tbody></table>
        </div>
        <div>
          <div className="card">
            <div className="eyebrow">Who decides what</div>
            <table><thead><tr><th>Action</th><th>Decides</th><th>Why</th></tr></thead><tbody>{AUTONOMY.map(r => <tr key={r[0]}><td>{r[0]}</td><td><b>{r[1]}</b></td><td className="small muted">{r[2]}</td></tr>)}</tbody></table>
          </div>
          <div className="card">
            <div className="eyebrow">Stack</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Next.js on Vercel; agent runs server-side and streams each step to the screen</li>
              <li>OpenAI model with function calling for planning; deterministic fallback planner if the model is unavailable</li>
              <li>Supabase (Postgres) stores every submitted packet and decision for the insurer inbox and audit</li>
              <li>Policy: {POLICY.product}, {POLICY.insurer}; {Object.keys(POLICY.clauses).length} clauses as code</li>
            </ul>
          </div>
          <div className="card">
            <div className="eyebrow">Policy clauses used</div>
            {Object.entries(POLICY.clauses).map(([k, v]) => <p key={k} className="small" style={{ margin: '4px 0' }}><b>{k} {v.title}.</b> <span className="muted">{v.text}</span></p>)}
          </div>
        </div>
      </div>
    </div>
  );
}
