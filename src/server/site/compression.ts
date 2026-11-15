// gzip of text responses, as nginx did (`gzip_min_length 1024`, `gzip_comp_level 5`).
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

const gzipAsync = promisify(gzip);

const MIN_BYTES = 1024;
const LEVEL = 5;
const COMPRESSIBLE =
  /^(?:text\/|application\/(?:javascript|json|xml|rss\+xml|manifest\+json)|image\/(?:svg\+xml|x-icon))/;

/** Whether a content type is worth compressing (text, not already compressed formats). */
export function isCompressible(contentType: string | null): boolean {
  return COMPRESSIBLE.test(contentType ?? '');
}

/** Whether an `Accept-Encoding` header lists gzip without refusing it (`q=0`). */
export function acceptsGzip(header: string | undefined): boolean {
  return (header ?? '').split(',').some((entry) => {
    const [coding, ...params] = entry.split(';').map((part) => part.trim().toLowerCase());
    return coding === 'gzip' && !params.some((param) => /^q=0(?:\.0*)?$/.test(param));
  });
}

/** The body to send and its `Content-Encoding`, or `null` when it is sent as it is. */
export async function encodeBody(
  body: Buffer,
  contentType: string | null,
  acceptEncoding: string | undefined,
): Promise<{ body: Buffer; encoding: 'gzip' | null }> {
  if (body.length < MIN_BYTES || !isCompressible(contentType) || !acceptsGzip(acceptEncoding)) {
    return { body, encoding: null };
  }
  return { body: await gzipAsync(body, { level: LEVEL }), encoding: 'gzip' };
}
