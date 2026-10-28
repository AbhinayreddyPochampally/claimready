export default function Home() {
  return (
    <div>
      <div className="card" style={{ padding: 28 }}>
        <div className="eyebrow">Case 8 · Insurance &amp; InsurTech</div>
        <h1>ClaimReady fixes the claim file before it leaves the hospital,<br />so clean claims are approved on arrival.</h1>
        <p className="muted" style={{ maxWidth: 820, fontSize: 15 }}>
          An AI agent at the hospital insurance desk gathers the documents, checks them against the patient&apos;s policy,
          links every bill line to clinical evidence, fixes what it can, asks the desk when money changes, and submits.
          The insurer re-checks everything and auto-approves clean claims.
        </p>
        <div className="row" style={{ marginTop: 14 }}>
          <a className="btn terra" href="/desk">Open the desk queue →</a>
          <a className="btn secondary" href="/insurer">Insurer inbox</a>
          <a className="btn secondary" href="/how">How the agent works</a>
        </div>
      </div>

      <div className="grid3" style={{ marginTop: 16 }}>
        <div className="stat"><b>2.6</b>queries per claim today at a typical desk (desk interviews, n=6, indicative)</div>
        <div className="stat t"><b>4.5 h</b>to discharge approval while the file loops between hospital and insurer</div>
        <div className="stat"><b>Rs 8–10k Cr</b>lost every year to fraud, waste and abuse (BCG × Medi Assist, 2025)</div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="eyebrow">The agent loop</div>
        <h2 style={{ marginBottom: 12 }}>The query loop moves inside the hospital</h2>
        <div className="flow">
          <div className="box"><b>Gather</b><div className="small muted">read file, extract clinical facts</div></div><div className="arrow">→</div>
          <div className="box"><b>Check policy</b><div className="small muted">rules engine, clause citations</div></div><div className="arrow">→</div>
          <div className="box"><b>Link evidence</b><div className="small muted">every bill line to a record</div></div><div className="arrow">→</div>
          <div className="box hl"><b>Fix and re-check</b><div className="small muted">fetch documents, map codes, ask desk</div></div><div className="arrow">→</div>
          <div className="box"><b>Submit</b><div className="small muted">insurer re-verifies, auto-approves clean files</div></div>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>Try the six demo claims in the desk queue: a clean claim, a pharmacy bill that isn&apos;t itemised, a hospital code that doesn&apos;t match the insurer package, a missing ICU note, a room-rent deduction, and a suspicious claim.</p>
      </div>
    </div>
  );
}
