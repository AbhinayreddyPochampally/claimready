import InsurerInbox from '@/components/InsurerInbox';
import { POLICY, FAST_LANE_CAP } from '@/lib/policy';
export default function InsurerPage() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Insurer inbox</h1>
          <p>What the insurer&apos;s TPA desk receives. The insurer here is simulated: it re-runs the policy rules, evidence links and duplicate check itself, then applies fast-lane rule FL-1. Clean claims up to Rs {FAST_LANE_CAP.toLocaleString('en-IN')} are approved automatically; everything else goes to a medical adjudicator with the reasons attached.</p>
        </div>
      </div>
      <InsurerInbox />
      <p className="small muted" style={{ marginTop: 12 }}>Decision times are simulated: the re-check runs in milliseconds and a fixed stand-in delay of about 2 seconds is added. No real insurer system is connected. Agent time is how long the agent worked on the claim, excluding time spent waiting for the desk.</p>
    </div>
  );
}
