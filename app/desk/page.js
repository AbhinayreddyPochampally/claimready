import { CLAIMS, HOSPITAL, billTotal } from '@/lib/data';
import { POLICY } from '@/lib/policy';
import { DEMO } from '@/lib/demo';
import DeskQueue from '@/components/DeskQueue';

export default function DeskPage() {
  const rows = [...CLAIMS].sort((a, b) => DEMO[a.id].order - DEMO[b.id].order).map(c => ({
    id: c.id, patient: c.patient, diagnosis: c.diagnosis, procedure: c.procedure,
    amount: billTotal(c.bill), deskNote: c.deskNote, demo: DEMO[c.id]
  }));
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Discharge queue</h1>
          <p>{HOSPITAL.name}, {HOSPITAL.city}. Six cashless claims with discharge advised today, all with {POLICY.insurer}. Start with C-103: it shows the desk approval gate.</p>
        </div>
      </div>
      <DeskQueue rows={rows} />
    </div>
  );
}
