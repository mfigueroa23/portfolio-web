import { gunzipSync } from 'node:zlib';
import { acceptsGzip, encodeBody, isCompressible } from './compression';

describe('isCompressible', () => {
  it('accepts text formats', () => {
    expect(isCompressible('text/html; charset=utf-8')).toBe(true);
    expect(isCompressible('text/javascript; charset=utf-8')).toBe(true);
    expect(isCompressible('application/rss+xml; charset=utf-8')).toBe(true);
    expect(isCompressible('application/manifest+json')).toBe(true);
    expect(isCompressible('image/svg+xml')).toBe(true);
  });

  it('rejects formats that are already compressed', () => {
    expect(isCompressible('image/webp')).toBe(false);
    expect(isCompressible('application/pdf')).toBe(false);
    expect(isCompressible(null)).toBe(false);
  });
});

describe('acceptsGzip', () => {
  it('accepts gzip when the client lists it', () => {
    expect(acceptsGzip('gzip, deflate, br')).toBe(true);
    expect(acceptsGzip('br;q=1.0, gzip;q=0.8')).toBe(true);
  });

  it('rejects gzip when missing or refused', () => {
    expect(acceptsGzip('br')).toBe(false);
    expect(acceptsGzip('gzip;q=0')).toBe(false);
    expect(acceptsGzip(undefined)).toBe(false);
  });
});

describe('encodeBody', () => {
  const large = Buffer.from('a'.repeat(2048));

  it('gzips large text bodies for clients that accept it', async () => {
    const { body, encoding } = await encodeBody(large, 'text/html', 'gzip');
    expect(encoding).toBe('gzip');
    expect(gunzipSync(body).equals(large)).toBe(true);
  });

  it('leaves small bodies, binary types and other clients as they are', async () => {
    const small = Buffer.from('ok');
    expect(await encodeBody(small, 'text/html', 'gzip')).toEqual({ body: small, encoding: null });
    expect(await encodeBody(large, 'image/webp', 'gzip')).toEqual({ body: large, encoding: null });
    expect(await encodeBody(large, 'text/html', 'br')).toEqual({ body: large, encoding: null });
  });
});
