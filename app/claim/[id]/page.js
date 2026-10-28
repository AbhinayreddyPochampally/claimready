import { getClaim, publicClaim, billTotal } from '@/lib/data';
import { POLICY } from '@/lib/policy';
import ClaimWorkspace from '@/components/ClaimWorkspace';
import { notFound } from 'next/navigation';

export default async function ClaimPage({ params }) {
  const { id } = await params;
  const c = getClaim(id);
  if (!c) notFound();
  return <ClaimWorkspace claim={publicClaim(c)} total={billTotal(c.bill)} clauses={POLICY.clauses} policy={{ insurer: POLICY.insurer, product: POLICY.product, sumInsured: POLICY.sumInsured }} />;
}
