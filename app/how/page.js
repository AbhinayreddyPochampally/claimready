import { POLICY } from '@/lib/policy';
const TOOLS = [
  ['read_claim_file', 'Gather', 'Reads the bill, room, pre-auth and the documents attached.'],
  ['extract_clinical_facts', 'Gather', 'Extracts diagnosis, procedures, ICU days and symptoms from the discharge summary and reports: by the LLM when a model is configured, otherwise by a rule-based reader (the trace says which).'],
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
      <div className="page-head"><div>
      <h1>How the agent works</h1>
      <p>When a model is configured, a language model plans each step through OpenAI function calling and the tools do the work. Without a model, a deterministic fallback planner calls the same tools in a fixed order, and the screen says so. Policy rules always run as fixed code, so the same claim gives the same result. No planner can deny a claim.</p>
      </div></div>
      <div className="ws">
        <div className="panel"><header><h2>Tools the agent can call</h2></header><div className="body">
          <table><tbody>{TOOLS.map(([n, s, d]) => <tr key={n}><td style={{ width: 120 }}><b>{s}</b></td><td><span className="code">{n}</span><div className="small muted">{d}</div></td></tr>)}</tbody></table>
        </div></div>
        <div>
          <div className="panel"><header><h2>Who decides what</h2></header>
            <table><thead><tr><th>Action</th><th>Decides</th><th>Why</th></tr></thead><tbody>{AUTONOMY.map(r => <tr key={r[0]}><td>{r[0]}</td><td><b>{r[1]}</b></td><td className="small muted">{r[2]}</td></tr>)}</tbody></table>
          </div>
          <div className="panel"><header><h2>Stack</h2></header><div className="body">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Next.js on Vercel; agent runs server-side and streams each step to the screen</li>
              <li>OpenAI model with function calling for planning when a key is configured; otherwise a deterministic fallback planner, labelled as such on every run</li>
              <li>Hospital records system and insurer are simulated; all data is synthetic</li>
              <li>Supabase (Postgres) stores every submitted packet and decision for the insurer inbox and audit trail</li>
              <li>Policy: {POLICY.product}, {POLICY.insurer}; {Object.keys(POLICY.clauses).length} clauses as code</li>
            </ul>
          </div></div>
          <div className="panel"><header><h2>Policy clauses used</h2></header><div className="body">
            {Object.entries(POLICY.clauses).map(([k, v]) => <p key={k} className="small" style={{ margin: '4px 0' }}><b>{k} {v.title}.</b> <span className="muted">{v.text}</span></p>)}
          </div></div>
        </div>
      </div>
      <section className="panel" id="model" style={{ marginTop: 16 }}>
        <header><h2>Where the 64% comes from</h2><span className="sect-note">A simulation, not a measurement from this demo</span></header>
        <div className="body">
          <p style={{ maxWidth: '80ch' }}>We simulated 20,000 cashless claims per scenario (Monte Carlo). The baseline is calibrated to IRDAI turnaround data (96.69% of discharges decided within 3 hours of a complete file, Lok Sabha reply, Dec 2025) and to Star Health&apos;s roughly 20% no-touch rate. With ClaimReady, 64% of claims are decided in under 10 minutes, against about 20% today.</p>
          <div className="kv" style={{ marginTop: 12, maxWidth: 820 }}>
            <div>Files clean on first pass</div><div>60% today, 85% with ClaimReady (assumption; tested in the pilot)</div>
            <div>Clean files auto-approved</div><div>33% today, 75% with ClaimReady (a requirement on the insurer&apos;s fast-lane rules)</div>
            <div>Adjudicator review, median</div><div>40 minutes today, 20 minutes with a re-verified packet</div>
            <div>Query reply, median</div><div>90 minutes today, 15 minutes when the agent fetches the item</div>
            <div>Sensitivity</div><div>The insurer&apos;s auto-approval share moves the result most: 56% to 74% across our sweep</div>
          </div>
        </div>
      </section>
    </div>
  );
}
