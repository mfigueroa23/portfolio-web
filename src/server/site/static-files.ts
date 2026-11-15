// Files of the browser build (scripts, styles, images and the prerendered pages), served with
// nginx's `try_files $uri $uri/` behavior: a directory is served through its index.html.
import { stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

export interface StaticFile {
  path: string;
  size: number;
  mtimeMs: number;
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
};

/** `Content-Type` of a file by its extension. */
export function contentTypeFor(file: string): string {
  return CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

/** Strong entity tag from the modification time (seconds) and size, as nginx builds it. */
export function entityTag(mtimeMs: number, size: number): string {
  return `"${Math.floor(mtimeMs / 1000).toString(16)}-${size.toString(16)}"`;
}

/** Absolute path inside `root` for a URL path, or `null` if it is malformed or escapes `root`. */
function pathInside(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const base = resolve(root);
  const path = resolve(base, `.${decoded}`);
  return path === base || path.startsWith(base + sep) ? path : null;
}

async function fileAt(path: string): Promise<StaticFile | null> {
  try {
    const stats = await stat(path);
    return stats.isFile() ? { path, size: stats.size, mtimeMs: stats.mtimeMs } : null;
  } catch {
    return null;
  }
}

/** The file serving a URL path, or `null` when there is none. */
export async function resolveStaticFile(root: string, urlPath: string): Promise<StaticFile | null> {
  const path = pathInside(root, urlPath);
  if (!path) return null;
  return (await fileAt(path)) ?? (await fileAt(join(path, 'index.html')));
}
