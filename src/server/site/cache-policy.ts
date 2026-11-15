// Cache and Vary policy of every response, taken over from the nginx `map` blocks (Spec 004
// RF-130). Exact paths are checked first, then the patterns in order, like nginx does.

const PRIVATE = 'private, no-cache';
const REVALIDATE = 'no-cache';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const ONE_DAY = 'public, max-age=86400';

const FEED = '/blog/rss.xml';
const CONTENT_PAGE = /^\/(?:projects|experience|blog)(?:\/|$)/;
const SPANISH_PAGE = /^\/es(?:\/|$)/;
const HTML_FILE = /\.html$/;
// The build names hashed files `<name>-<8 chars>.<ext>`, with base64url characters.
const HASHED_ASSET = /-[A-Za-z0-9_-]{8}\.(?:js|css)$/;

const EXACT: Record<string, string> = {
  '/': PRIVATE,
  '/index.html': PRIVATE,
  [FEED]: REVALIDATE,
};

const PATTERNS: [RegExp, string][] = [
  [CONTENT_PAGE, PRIVATE],
  [SPANISH_PAGE, REVALIDATE],
  [HTML_FILE, REVALIDATE],
  [HASHED_ASSET, IMMUTABLE],
];

/** `Cache-Control` of a path. English pages depend on the language redirect, so they are private. */
export function cacheControl(path: string): string {
  if (Object.hasOwn(EXACT, path)) return EXACT[path];
  return PATTERNS.find(([pattern]) => pattern.test(path))?.[1] ?? ONE_DAY;
}

/** English pages a first visit in Spanish is redirected from: the home and the content pages. */
export function isLanguageRedirectable(path: string): boolean {
  if (path === FEED) return false;
  return path === '/' || CONTENT_PAGE.test(path);
}

/** `Vary` of a page that depends on the language preference and cookie, or `null`. */
export function languageVary(path: string): string | null {
  return isLanguageRedirectable(path) ? 'Accept-Language, Cookie' : null;
}
