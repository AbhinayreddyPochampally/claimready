import { CLAIMS, billTotal } from '@/lib/data';
import { DEMO, STATIONS } from '@/lib/demo';
import { inr } from '@/components/format';

export default function Home() {
  const rows = [...CLAIMS].sort((a, b) => DEMO[a.id].order - DEMO[b.id].order);
  return (
    <div>
      <section className="hero">
        <div>
          <h1>Claim files that are complete before they leave the hospital.</h1>
          <p className="lede">ClaimReady works at the hospital insurance desk. An AI agent reads the claim, runs the patient&apos;s policy rules, links every bill line to a clinical record and fixes what it can. Any change to money waits for the desk. The insurer then re-checks the packet itself and approves clean claims on arrival.</p>
          <div className="actions">
            <a className="btn lg" href="/claim/C-103">Run the main demo: claim C-103</a>
            <a className="btn ghost lg" href="/desk">See all six claims</a>
          </div>
        </div>
        <div className="facts">
            <div><b>96.7%</b><span>of discharges decided within 3 h once the file is complete (IRDAI data, Dec 2025)</span></div>
            <div><b>59%</b><span>of patients waited 6 to 48 h for discharge approval (LocalCircles, n = 30,366)</span></div>
            <div><b>8 to 10%</b><span>of claim payouts lost to fraud, waste and abuse (BCG and Medi Assist, 2025)</span></div>
          </div>
      </section>

        <div className="targets">
          <div><b>Case 8 goal</b></div>
          <div>Settle <b>60%</b> of standard claims in under 10 minutes. Our simulation models <b>64%</b> decided in under 10 minutes with ClaimReady, if insurers auto-approve about 75% of clean files. <a href="/how#model">How we modelled it</a></div>
          <div>Cut fraudulent payout leakage by <b>30%</b>. Our fraud model&apos;s base case is a 33% cut (range 20% to 40%); the pilot measures it against control hospitals.</div>
        </div>

        <div className="board" aria-label="Demo claims and where each one needs the agent">
          <div className="board-head">
            <h2>Six demo claims, and where each one needs the agent</h2>
            <p className="sect-note" style={{ marginTop: 4 }}>Each row is a synthetic claim built around one real failure mode. Pick a row to open it and run the agent.</p>
          </div>
          <div className="board-grid" role="table">
            <div className="colh" role="columnheader">Claim</div>
            {STATIONS.map(s => <div key={s.key} className="colh" role="columnheader">{s.name}</div>)}
            <div className="colh" role="columnheader">Designed outcome</div>
            {rows.map(c => {
              const d = DEMO[c.id];
              return (
                <div className="board-row" role="row" key={c.id}>
                  <div className="board-claim" role="cell"><a href={`/claim/${c.id}`}>{c.id} {c.patient.name}</a><span>{inr(billTotal(c.bill))}</span></div>
                  {STATIONS.map(s => {
                    const m = d.marks[s.key];
                    const cls = s.key === 'desk' ? 'hit gate' : (c.id === 'C-106' && m) ? 'hit flag' : 'hit';
                    return <div key={s.key} className="cell" role="cell"><span className="rail" />{m ? <span className={cls}>{m}</span> : <span className="dot" title="Passes" />}</div>;
                  })}
                  <div className="outcome" role="cell"><span className={`pill ${d.expectKind}`}>{d.expect}</span></div>
                </div>
              );
            })}
          </div>
        </div>

      <div className="three">
        <section className="panel">
          <header><h2>What you will see in a claim</h2></header>
          <div className="body">
            <ol className="guide-list">
              <li>The claim file, bill lines and documents</li>
              <li>Each bill line linked to its clinical evidence</li>
              <li>Policy checks with the clause they come from</li>
              <li>The agent&apos;s trace: every tool call and its result</li>
              <li>The desk approval gate, when money would change</li>
              <li>The simulated insurer&apos;s re-check and decision</li>
            </ol>
          </div>
        </section>
        <section className="panel">
          <header><h2>Who decides what</h2></header>
          <div className="body">
            <div className="kv">
              <div>Agent</div><div>Reads, checks, links evidence, fetches records, maps codes from a closed list</div>
              <div>Desk executive</div><div>Approves or rejects any change to a billed amount</div>
              <div>Insurer rules</div><div>Auto-approve clean claims up to Rs 75,000 (rule FL-1)</div>
              <div>Committee</div><div>The only party that can deny. The agent never denies.</div>
            </div>
          </div>
        </section>
        <section className="panel">
          <header><h2>What is real in this demo</h2></header>
          <div className="body">
            <div className="kv">
              <div>Real</div><div>The agent loop, 12 tools, the policy rules engine, the approval gate, the audit trail</div>
              <div>Simulated</div><div>Hospital records system, insurer decision service and its response time</div>
              <div>Synthetic</div><div>All six patients, documents, the hospital, insurer and policy</div>
              <div>Modelled, not shown</div><div>The 64% decided in under 10 minutes is a simulation result, not measured here</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
