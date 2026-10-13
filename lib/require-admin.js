// Server-side gate for admin endpoints. Lives outside api/ so Vercel does not
// deploy it as a function of its own.
//
// Two credentials are accepted:
//   x-meraki-pin        equal to MERAKI_ADMIN_PIN — what the app sends via adminFetch()
//   x-meraki-agent-key  equal to MERAKI_AGENT_KEY — for development tooling, so it can
//                       be revoked without changing Saima's PIN
//
// FAILS CLOSED, as /api/inquiries does: if neither variable is configured every
// request is refused, so a forgotten environment variable leaves the deployment
// visibly broken instead of quietly open.
//
// Returns null when the request may proceed, or { code, error } to refuse it.
export function denyAdmin(req) {
  const pin = process.env.MERAKI_ADMIN_PIN;
  const agentKey = process.env.MERAKI_AGENT_KEY;
  if (!pin && !agentKey) {
    console.error('[require-admin] neither MERAKI_ADMIN_PIN nor MERAKI_AGENT_KEY is set — refusing all requests');
    return { code: 500, error: 'Admin access is not configured on the server.' };
  }
  const suppliedPin = req.headers['x-meraki-pin'];
  const suppliedKey = req.headers['x-meraki-agent-key'];
  if (pin && suppliedPin && suppliedPin === pin) return null;
  if (agentKey && suppliedKey && suppliedKey === agentKey) return null;
  return { code: 401, error: 'Unauthorized' };
}

// Access-Control-Allow-Headers for gated endpoints.
export const ADMIN_ALLOW_HEADERS = 'Content-Type, x-meraki-pin, x-meraki-agent-key';
