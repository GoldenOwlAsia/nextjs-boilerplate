/**
 * Liveness probe for load balancers and deploy checks. A static segment beats
 * the `[...path]` proxy, so this never reaches the backend.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
