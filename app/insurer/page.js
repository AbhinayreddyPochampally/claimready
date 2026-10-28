import InsurerInbox from '@/components/InsurerInbox';
import { POLICY, FAST_LANE_CAP } from '@/lib/policy';
export default function InsurerPage() {
  return (
    <div>
      <div className="eyebrow">Insurer / TPA side · {POLICY.tpa}</div>
      <h1>Adjudication inbox</h1>
      <p className="muted" style={{ maxWidth: 860 }}>Every packet ClaimReady submits lands here. The insurer re-runs the policy rules, evidence links and duplicate check itself, then applies fast-lane rule FL-1: claims up to {`Rs ${FAST_LANE_CAP.toLocaleString('en-IN')}`} with every check passed and no flags are approved automatically; the rest go to a medical adjudicator with the evidence already mapped.</p>
      <InsurerInbox />
    </div>
  );
}
