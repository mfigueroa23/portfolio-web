import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer, IncomingHttpHeaders, request, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createSiteHandler, RenderRequest } from './site-handler';

interface Reply {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

const HOST = 'marco.figueroa-sanchez.com';
const SCRIPT = `console.log("${'x'.repeat(2048)}");`;

function createSite(): string {
  const root = mkdtempSync(join(tmpdir(), 'browser-'));
  mkdirSync(join(root, 'es'));
  writeFileSync(join(root, 'index.html'), '<html>home</html>');
  writeFileSync(join(root, 'es', 'index.html'), '<html>inicio</html>');
  writeFileSync(join(root, 'main-ABCD1234.js'), SCRIPT);
  writeFileSync(join(root, '.env'), 'SECRET=1');
  return root;
}

const render: RenderRequest = async (incoming) => {
  if (incoming.url === '/boom') throw new Error('render failed');
  if (!incoming.url?.startsWith('/projects')) return null;
  return new Response('<html>projects</html>', {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};

describe('createSiteHandler', () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    const handler = createSiteHandler({
      browserDir: createSite(),
      csp: "default-src 'none'",
      allowedHosts: [HOST, 'localhost'],
      render,
    });
    server = createServer(handler);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  function send(path: string, headers: Record<string, string> = {}, method = 'GET') {
    return new Promise<Reply>((resolve, reject) => {
      const outgoing = request(
        { host: '127.0.0.1', port, path, method, headers: { host: HOST, ...headers } },
        (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () =>
            resolve({
              status: response.statusCode ?? 0,
              headers: response.headers,
              body: Buffer.concat(chunks),
            }),
          );
        },
      );
      outgoing.on('error', reject);
      outgoing.end();
    });
  }

  it('answers the health probe on any host', async () => {
    const reply = await send('/healthz', { host: '10.0.0.5:8080' });
    expect(reply.status).toBe(200);
    expect(reply.body.toString()).toBe('ok\n');
  });

  it('logs each request as one JSON line with the bytes sent', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await send('/main-ABCD1234.js', { 'x-forwarded-for': '203.0.113.9' });
    await new Promise((resolve) => setImmediate(resolve));
    const entry = JSON.parse(String(log.mock.calls.at(-1)?.[0]));
    log.mockRestore();
    expect(entry).toMatchObject({
      remote_addr: '203.0.113.9',
      method: 'GET',
      uri: '/main-ABCD1234.js',
      status: 200,
      bytes: SCRIPT.length,
    });
  });

  it('drops the connection for unknown hosts', async () => {
    await expect(send('/', { host: 'evil.example.com' })).rejects.toThrow();
  });

  it('serves the prerendered home with the security and cache headers', async () => {
    const reply = await send('/');
    expect(reply.status).toBe(200);
    expect(reply.body.toString()).toBe('<html>home</html>');
    expect(reply.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(reply.headers['content-security-policy']).toBe("default-src 'none'");
    expect(reply.headers['x-frame-options']).toBe('DENY');
    expect(reply.headers['cache-control']).toBe('private, no-cache');
    expect(reply.headers['vary']).toBe('Accept-Language, Cookie, Accept-Encoding');
    expect(reply.headers['etag']).toMatch(/^"[0-9a-f]+-[0-9a-f]+"$/);
  });

  it('serves the Spanish home at /es without a directory redirect', async () => {
    const reply = await send('/es');
    expect(reply.status).toBe(200);
    expect(reply.body.toString()).toBe('<html>inicio</html>');
    expect(reply.headers['cache-control']).toBe('no-cache');
  });

  it('answers 304 when the file did not change', async () => {
    const first = await send('/');
    const reply = await send('/', { 'if-none-match': String(first.headers['etag']) });
    expect(reply.status).toBe(304);
    expect(reply.body.length).toBe(0);
  });

  it('gzips large text files and caches hashed assets for a year', async () => {
    const reply = await send('/main-ABCD1234.js', { 'accept-encoding': 'gzip' });
    expect(reply.status).toBe(200);
    expect(reply.headers['content-encoding']).toBe('gzip');
    expect(reply.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(gunzipSync(reply.body).toString()).toBe(SCRIPT);
  });

  it('answers HEAD with the headers only', async () => {
    const reply = await send('/main-ABCD1234.js', {}, 'HEAD');
    expect(reply.status).toBe(200);
    expect(reply.headers['content-length']).toBe(String(SCRIPT.length));
    expect(reply.body.length).toBe(0);
  });

  it('refuses methods other than GET and HEAD', async () => {
    const reply = await send('/', {}, 'POST');
    expect(reply.status).toBe(405);
    expect(reply.headers['content-security-policy']).toBe("default-src 'none'");
  });

  it('redirects a first visit in Spanish to the Spanish page', async () => {
    const reply = await send('/projects?page=2', { 'accept-language': 'es-CL,es;q=0.9' });
    expect(reply.status).toBe(302);
    expect(reply.headers['location']).toBe('/es/projects?page=2');
    expect(reply.headers['cache-control']).toBe('private, no-cache');
  });

  it('hides dotfiles', async () => {
    const reply = await send('/.env');
    expect(reply.status).toBe(404);
    expect(reply.body.toString()).not.toContain('SECRET');
  });

  it('renders the content pages with the site cache policy', async () => {
    const reply = await send('/projects');
    expect(reply.status).toBe(200);
    expect(reply.body.toString()).toBe('<html>projects</html>');
    expect(reply.headers['cache-control']).toBe('private, no-cache');
    expect(reply.headers['content-security-policy']).toBe("default-src 'none'");
  });

  it('answers 404 when nothing serves the path', async () => {
    const reply = await send('/missing.txt');
    expect(reply.status).toBe(404);
  });

  it('answers 500 when the render fails', async () => {
    const reply = await send('/boom');
    expect(reply.status).toBe(500);
    expect(reply.body.toString()).toBe('Internal server error.\n');
  });
});
