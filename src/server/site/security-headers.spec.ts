import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  contentSecurityPolicy,
  cspOrigin,
  loadScriptSources,
  securityHeaders,
} from './security-headers';

describe('cspOrigin', () => {
  it('keeps only the scheme, host and port', () => {
    expect(cspOrigin('https://api.figueroa-sanchez.com/v1/')).toBe(
      'https://api.figueroa-sanchez.com',
    );
    expect(cspOrigin('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('rejects values that could inject CSP directives', () => {
    expect(() => cspOrigin("https://a.com; script-src 'unsafe-inline'")).toThrow();
    expect(() => cspOrigin('javascript:alert(1)')).toThrow();
    expect(() => cspOrigin('')).toThrow();
  });
});

describe('contentSecurityPolicy', () => {
  const csp = contentSecurityPolicy("'sha256-abc='", [
    'https://api.figueroa-sanchez.com',
    'https://agent.figueroa-sanchez.com',
  ]);

  it('allows only the site and the given hashes as script sources', () => {
    expect(csp).toContain("script-src 'self' 'sha256-abc=';");
  });

  it('allows connections to the site and the given origins', () => {
    expect(csp).toContain(
      "connect-src 'self' https://api.figueroa-sanchez.com https://agent.figueroa-sanchez.com;",
    );
  });

  it('denies everything not listed and framing', () => {
    expect(csp.startsWith("default-src 'none';")).toBe(true);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
});

describe('securityHeaders', () => {
  it('sends the CSP and the hardening headers', () => {
    const headers = securityHeaders("default-src 'none'");
    expect(headers['Content-Security-Policy']).toBe("default-src 'none'");
    expect(headers['Strict-Transport-Security']).toBe('max-age=63072000; includeSubDomains');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
  });
});

describe('loadScriptSources', () => {
  const dir = mkdtempSync(join(tmpdir(), 'csp-'));

  it('reads the generated sources without surrounding whitespace', () => {
    const file = join(dir, 'sources.txt');
    writeFileSync(file, "'sha256-abc=' 'sha256-def='\n");
    expect(loadScriptSources(file)).toBe("'sha256-abc=' 'sha256-def='");
  });

  it('refuses an empty file or a leftover placeholder', () => {
    const empty = join(dir, 'empty.txt');
    writeFileSync(empty, '\n');
    expect(() => loadScriptSources(empty)).toThrow();
    const placeholder = join(dir, 'placeholder.txt');
    writeFileSync(placeholder, '__CSP_SCRIPT_HASHES__\n');
    expect(() => loadScriptSources(placeholder)).toThrow();
  });

  it('fails when the file is missing', () => {
    expect(() => loadScriptSources(join(dir, 'missing.txt'))).toThrow();
  });
});
