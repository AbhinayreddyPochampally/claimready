import { getClaim, publicClaim, billTotal } from '@/lib/data';
import { notFound } from 'next/navigation';
import InsurerReview from '@/components/InsurerReview';
export const dynamic = 'force-dynamic';
export default async function Page({ params }) {
  const { id } = await params;
  const c = getClaim(id);
  if (!c) notFound();
  const pc = publicClaim(c);
  return <InsurerReview claim={{ id: pc.id, patient: pc.patient, diagnosis: pc.diagnosis, procedure: pc.procedure, total: billTotal(c.bill) }} />;
}
