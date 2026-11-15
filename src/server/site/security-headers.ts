// Security headers of every response, taken over from nginx. The CSP script sources are the
// hashes of the inline scripts of the prerendered and server-rendered pages, computed at image
// build time (docker/csp-hashes.pl) into a file the server reads on start.
import { readFileSync } from 'node:fs';

const PLACEHOLDER = '__CSP_SCRIPT_HASHES__';

// Only scheme://host[:port] reaches the CSP, so a URL can't inject directives.
const ORIGIN = /^(https?:\/\/[A-Za-z0-9.-]+(?::\d+)?)(?:\/.*)?$/;

/** Origin of a URL for the CSP; throws when the URL is not a plain http(s) URL. */
export function cspOrigin(url: string): string {
  const match = ORIGIN.exec(url);
  if (!match) throw new Error(`Invalid origin for the CSP: ${url}`);
  return match[1];
}

/** CSP of the site; `scriptSources` are the inline script hashes, `connectOrigins` the APIs. */
export function contentSecurityPolicy(scriptSources: string, connectOrigins: string[]): string {
  return [
    "default-src 'none'",
    `script-src 'self' ${scriptSources}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "img-src 'self' data: https:",
    `connect-src 'self' ${connectOrigins.join(' ')}`,
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/** Headers sent with every response of the site. */
export function securityHeaders(csp: string): Record<string, string> {
  return {
    'Content-Security-Policy': csp,
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
}

/** Script sources generated at build time; fails rather than serving without them. */
export function loadScriptSources(file: string): string {
  const sources = readFileSync(file, 'utf8').trim();
  if (!sources || sources.includes(PLACEHOLDER)) {
    throw new Error(`No CSP script sources in ${file}`);
  }
  return sources;
}
