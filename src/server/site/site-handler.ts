// The site's HTTP handler: one Node process serves what nginx and the SSR sidecar used to split.
// Static files of the browser build (including the prerendered homes) are served directly;
// everything else goes to the SSR render (Angular engine and the RSS feeds).
import { readFile } from 'node:fs/promises';
import { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http';
import { accessLogLine } from './access-log';
import { cacheControl, languageVary } from './cache-policy';
import { encodeBody, isCompressible } from './compression';
import { spanishRedirect } from './language-redirect';
import { clientAddress, isAllowedHost, isHiddenPath, isReadMethod } from './request-guard';
import { securityHeaders } from './security-headers';
import { contentTypeFor, entityTag, resolveStaticFile, StaticFile } from './static-files';

/** Renders a request on the server, or answers `null` when no route handles it. */
export type RenderRequest = (request: IncomingMessage) => Promise<Response | null>;

export interface SiteOptions {
  /** Directory of the browser build. */
  browserDir: string;
  /** Content-Security-Policy sent with every page. */
  csp: string;
  /** Hosts the site answers; any other host only gets the health probe. */
  allowedHosts: readonly string[];
  render: RenderRequest;
}

const HEALTH_PATH = '/healthz';
const TEXT = 'text/plain; charset=utf-8';

/** URL of the request, or `null` when its target can't be parsed. */
function requestUrl(request: IncomingMessage): URL | null {
  try {
    return new URL(`http://localhost${request.url ?? '/'}`);
  } catch {
    return null;
  }
}

/** Headers of every response for `path`: security, cache policy and language `Vary`. */
function baseHeaders(csp: string, path: string): OutgoingHttpHeaders {
  const vary = languageVary(path);
  return {
    ...securityHeaders(csp),
    'Cache-Control': cacheControl(path),
    ...(vary ? { Vary: vary } : {}),
  };
}

function appendVary(headers: OutgoingHttpHeaders, value: string): OutgoingHttpHeaders {
  const vary = headers['Vary'] ? `${String(headers['Vary'])}, ${value}` : value;
  return { ...headers, Vary: vary };
}

/** Writes the status and headers; set one by one so the access log can read them back. */
function writeHead(response: ServerResponse, status: number, headers: OutgoingHttpHeaders): void {
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) response.setHeader(name, value);
  }
  response.writeHead(status);
}

/** Sends a body, gzipped when the client accepts it, without it for HEAD requests. */
async function send(
  request: IncomingMessage,
  response: ServerResponse,
  status: number,
  headers: OutgoingHttpHeaders,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const encoded = await encodeBody(body, contentType, request.headers['accept-encoding']);
  const finalHeaders = isCompressible(contentType)
    ? appendVary(headers, 'Accept-Encoding')
    : headers;
  writeHead(response, status, {
    ...finalHeaders,
    'Content-Type': contentType,
    'Content-Length': String(encoded.body.length),
    ...(encoded.encoding ? { 'Content-Encoding': encoded.encoding } : {}),
  });
  response.end(request.method === 'HEAD' ? undefined : encoded.body);
}

function sendText(
  request: IncomingMessage,
  response: ServerResponse,
  status: number,
  text: string,
  headers: OutgoingHttpHeaders,
): Promise<void> {
  return send(request, response, status, headers, Buffer.from(text), TEXT);
}

function sendEmpty(response: ServerResponse, status: number, headers: OutgoingHttpHeaders): void {
  writeHead(response, status, headers);
  response.end();
}

async function sendFile(
  request: IncomingMessage,
  response: ServerResponse,
  file: StaticFile,
  headers: OutgoingHttpHeaders,
): Promise<void> {
  const etag = entityTag(file.mtimeMs, file.size);
  const fileHeaders = {
    ...headers,
    ETag: etag,
    'Last-Modified': new Date(file.mtimeMs).toUTCString(),
  };
  if (request.headers['if-none-match'] === etag) return sendEmpty(response, 304, fileHeaders);
  await send(
    request,
    response,
    200,
    fileHeaders,
    await readFile(file.path),
    contentTypeFor(file.path),
  );
}

/** Headers of a rendered response, without the ones the site sets itself. */
function renderedHeaders(rendered: Response): OutgoingHttpHeaders {
  const headers: OutgoingHttpHeaders = {};
  const skipped = [
    'cache-control',
    'content-length',
    'content-encoding',
    'content-type',
    'set-cookie',
  ];
  rendered.headers.forEach((value, name) => {
    if (!skipped.includes(name)) headers[name] = value;
  });
  const cookies = rendered.headers.getSetCookie();
  if (cookies.length > 0) headers['set-cookie'] = cookies;
  return headers;
}

async function sendRendered(
  request: IncomingMessage,
  response: ServerResponse,
  rendered: Response,
  headers: OutgoingHttpHeaders,
): Promise<void> {
  // The site's cache policy replaces the render's own `Cache-Control`.
  const merged = { ...renderedHeaders(rendered), ...headers };
  if (rendered.status === 304) return sendEmpty(response, 304, merged);
  const body = Buffer.from(await rendered.arrayBuffer());
  const contentType = rendered.headers.get('content-type') ?? 'application/octet-stream';
  await send(request, response, rendered.status, merged, body, contentType);
}

async function handleSite(
  options: SiteOptions,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const url = requestUrl(request);
  if (!url) return sendEmpty(response, 400, { 'Content-Type': TEXT });
  const path = url.pathname;
  if (path === HEALTH_PATH) {
    response.writeHead(200, { 'Content-Type': TEXT, 'Cache-Control': 'no-store' });
    return void response.end('ok\n');
  }
  // Unknown hosts get no answer at all, like nginx's `return 444`.
  if (!isAllowedHost(request.headers.host, options.allowedHosts)) {
    return void request.socket.destroy();
  }
  const headers = baseHeaders(options.csp, path);
  if (!isReadMethod(request.method)) {
    return sendText(request, response, 405, 'Method not allowed.\n', {
      ...headers,
      Allow: 'GET, HEAD',
    });
  }
  const location = spanishRedirect(
    path,
    path + url.search,
    request.headers.cookie,
    request.headers['accept-language'],
  );
  if (location) return sendEmpty(response, 302, { ...headers, Location: location });
  if (isHiddenPath(path)) return sendText(request, response, 404, 'Not found.\n', headers);

  const file = await resolveStaticFile(options.browserDir, path);
  if (file) return sendFile(request, response, file, headers);
  const rendered = await options.render(request);
  if (rendered) return sendRendered(request, response, rendered, headers);
  return sendText(request, response, 404, 'Not found.\n', headers);
}

function sendError(response: ServerResponse, error: unknown): void {
  console.error('Request failed:', error);
  if (response.headersSent) return void response.end();
  response.writeHead(500, { 'Content-Type': TEXT, 'X-Content-Type-Options': 'nosniff' });
  response.end('Internal server error.\n');
}

/** A header's value, with repeated headers joined as one list. */
function headerValue(header: string | string[] | undefined): string | undefined {
  return Array.isArray(header) ? header.join(', ') : header;
}

function logRequest(request: IncomingMessage, response: ServerResponse, startedAt: number): void {
  const line = accessLogLine({
    time: new Date(),
    remoteAddress: clientAddress(
      request.socket.remoteAddress,
      headerValue(request.headers['x-forwarded-for']),
    ),
    method: request.method ?? '',
    path: request.url ?? '',
    status: response.statusCode,
    bytes: Number(response.getHeader('content-length') ?? 0),
    durationMs: performance.now() - startedAt,
    referer: request.headers.referer,
    userAgent: request.headers['user-agent'],
  });
  console.log(line);
}

/** Request listener of the site server. */
export function createSiteHandler(options: SiteOptions) {
  return (request: IncomingMessage, response: ServerResponse): void => {
    const startedAt = performance.now();
    if (request.url !== HEALTH_PATH) {
      response.on('finish', () => logRequest(request, response, startedAt));
    }
    handleSite(options, request, response).catch((error: unknown) => sendError(response, error));
  };
}
