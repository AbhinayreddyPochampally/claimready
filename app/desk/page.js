import { CLAIMS, HOSPITAL, billTotal } from '@/lib/data';
import { POLICY } from '@/lib/policy';
import DeskQueue from '@/components/DeskQueue';

export default function DeskPage() {
  const rows = CLAIMS.map(c => ({
    id: c.id, patient: c.patient, diagnosis: c.diagnosis, procedure: c.procedure,
    amount: billTotal(c.bill), docs: c.documents.length, deskNote: c.deskNote, discharge: c.discharge
  }));
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
        <div>
          <div className="eyebrow">Hospital insurance desk · {HOSPITAL.name}, {HOSPITAL.city}</div>
          <h1>Priya&apos;s discharge queue</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>Six patients with discharge advised today. Insurer: {POLICY.insurer}. Open a claim and run the agent.</p>
        </div>
      </div>
      <DeskQueue rows={rows} />
    </div>
  );
}
