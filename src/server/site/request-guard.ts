// Request filters taken over from nginx: read-only methods, known hosts, hidden files and the
// real client address behind the trusted Ingress.

/** The site is read-only: only GET and HEAD are served. */
export function isReadMethod(method: string | undefined): boolean {
  return method === 'GET' || method === 'HEAD';
}

/** Host name of a `Host` header, lowercased and without the port. */
export function hostName(header: string | undefined): string {
  const host = (header ?? '').trim().toLowerCase();
  if (host.startsWith('[')) return host.slice(0, host.indexOf(']') + 1);
  return host.split(':')[0];
}

/** Whether the `Host` header names one of the allowed hosts, on any port. */
export function isAllowedHost(header: string | undefined, allowed: readonly string[]): boolean {
  return allowed.includes(hostName(header));
}

const HIDDEN_PATHS = [
  // Dotfiles anywhere in the path, except ACME/well-known.
  /\/\.(?!well-known\/)/,
  // Source maps and editor or backup leftovers.
  /\.(?:map|bak|old|orig|swp|tmp)$/i,
];

/** Paths never served, even when the file exists. */
export function isHiddenPath(path: string): boolean {
  return HIDDEN_PATHS.some((pattern) => pattern.test(path));
}

// Private networks of the cluster and the Ingress, trusted to set X-Forwarded-For.
const TRUSTED_PROXY = /^(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|127\.0\.0\.1$)/;

const plainAddress = (address: string): string => address.trim().replace(/^::ffff:/, '');

/**
 * Real client address: walks X-Forwarded-For from the right while the hop is a trusted proxy,
 * like nginx's `real_ip_recursive`.
 */
export function clientAddress(
  socketAddress: string | undefined,
  forwardedFor: string | undefined,
): string {
  let address = plainAddress(socketAddress ?? '');
  const hops = (forwardedFor ?? '').split(',').map(plainAddress).filter(Boolean);
  while (TRUSTED_PROXY.test(address) && hops.length > 0) {
    address = hops.pop()!;
  }
  return address;
}
