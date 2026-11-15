// First visit in Spanish (Spec 004 RF-127 to RF-129): an English page requested without a
// remembered choice (`lang` cookie) by a browser whose first language is Spanish is redirected
// to its /es equivalent.
import { localizePath } from '../../app/core/i18n/language';
import { isLanguageRedirectable } from './cache-policy';

// Any variant of Spanish as the first preferred language: es, es-CL, es-419, es;q=1...
const SPANISH_FIRST = /^\s*es(?:[-;,]|$)/i;

/** Value of the cookie `name` in a `Cookie` header, or an empty string. */
export function readCookie(header: string | undefined, name: string): string {
  for (const pair of (header ?? '').split(';')) {
    const [key, ...value] = pair.split('=');
    if (key.trim() === name) return value.join('=').trim();
  }
  return '';
}

/**
 * Location of the Spanish page to redirect to, or `null` to serve the request as it is.
 * `target` is the request target (path and query), kept in the redirect.
 */
export function spanishRedirect(
  path: string,
  target: string,
  cookieHeader: string | undefined,
  acceptLanguage: string | undefined,
): string | null {
  if (!isLanguageRedirectable(path)) return null;
  if (readCookie(cookieHeader, 'lang')) return null;
  if (!SPANISH_FIRST.test(acceptLanguage ?? '')) return null;
  return localizePath(target, 'es');
}
