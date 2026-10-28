import { listRuns, storeMode } from '@/lib/store';
export const dynamic = 'force-dynamic';
export async function GET() {
  const runs = await listRuns();
  return Response.json({ runs, configured: true, store: storeMode() });
}
