import { getClaim, publicClaim } from '@/lib/data';
import { POLICY } from '@/lib/policy';
import { DEMO } from '@/lib/demo';
import ClaimWorkspace from '@/components/ClaimWorkspace';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ClaimPage({ params }) {
  const { id } = await params;
  const c = getClaim(id);
  if (!c) notFound();
  const planner = { available: !!process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4.1-mini' };
  return <ClaimWorkspace claim={publicClaim(c)} clauses={POLICY.clauses} policy={{ insurer: POLICY.insurer, product: POLICY.product, sumInsured: POLICY.sumInsured }} planner={planner} demo={DEMO[c.id]} />;
}
