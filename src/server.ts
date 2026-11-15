import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { AGENT_URL } from './app/core/config/agent';
import { API_URL } from './app/core/config/api';
import { SITE_URL } from './app/core/config/site';
import { Lang } from './app/core/i18n/language';
import { PostSummary } from './app/core/interfaces/content';
import { buildRssFeed } from './server/rss';
import {
  contentSecurityPolicy,
  cspOrigin,
  loadScriptSources,
} from './server/site/security-headers';
import { createSiteHandler } from './server/site/site-handler';

// Requests with any other Host header are refused by the engine (SSRF protection).
const ALLOWED_HOSTS = ['marco.figueroa-sanchez.com', 'localhost'];

const engine = new AngularNodeAppEngine({ allowedHosts: ALLOWED_HOSTS });

// A slow API must not hold the request; the feed then answers 503.
const FEED_TIMEOUT_MS = 5000;

type Next = (error?: unknown) => void;

/**
 * `GET /blog/rss.xml`: the latest published posts as RSS 2.0 (RF-107, RF-108);
 * `GET /es/blog/rss.xml`: the same posts from the API in Spanish (Spec 004 RF-143, RF-144).
 */
async function renderFeed(lang: Lang): Promise<Response> {
  try {
    const query = lang === 'es' ? '?lang=es' : '';
    const api = await fetch(`${API_URL}/content/posts/feed${query}`, {
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
    if (!api.ok) throw new Error(`API answered ${api.status}`);
    const feed = buildRssFeed((await api.json()) as PostSummary[], SITE_URL, lang);
    return new Response(feed, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('RSS feed unavailable:', error);
    return new Response('Feed temporarily unavailable.\n', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}

const FEEDS: Record<string, Lang> = { '/blog/rss.xml': 'en', '/es/blog/rss.xml': 'es' };

/** The language of a feed request, or `null` for any other request. */
function feedLang(request: IncomingMessage): Lang | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const path = new URL(request.url ?? '/', 'http://localhost').pathname;
  return Object.hasOwn(FEEDS, path) ? FEEDS[path] : null;
}

/** The feed or the server-rendered page of a request, or `null` when no route handles it. */
async function renderRequest(request: IncomingMessage): Promise<Response | null> {
  // The feed is XML, not an Angular route, so it is answered before the engine (plan D17).
  const lang = feedLang(request);
  if (lang) return renderFeed(lang);
  const rendered = await engine.handle(request);
  // Server-rendered pages reflect the content of each request (RF-120), so never cache them.
  rendered?.headers.set('Cache-Control', 'no-store');
  return rendered;
}

async function handle(request: IncomingMessage, response: ServerResponse, next: Next) {
  try {
    const rendered = await renderRequest(request);
    if (!rendered) return next();
    await writeResponseToNodeResponse(rendered, response);
  } catch (error) {
    next(error);
  }
}

/** Request handler used by the Angular CLI dev server and the build. */
export const reqHandler = createNodeRequestHandler(handle);

// The production server (the image runs `node server/server.mjs`): static files of the
// browser build, server-rendered pages and feeds, with the security headers, cache policy and
// language redirect of the site (they used to live in nginx).
const SERVER_DIR = dirname(fileURLToPath(import.meta.url));

// nginx's client timeouts: slow clients can't hold connections open.
const HEADERS_TIMEOUT_MS = 10_000;
const KEEP_ALIVE_TIMEOUT_MS = 15_000;

function startSiteServer(): void {
  const port = Number(process.env['PORT'] ?? 4000);
  const sourcesFile =
    process.env['CSP_SCRIPT_SOURCES_FILE'] ?? join(SERVER_DIR, 'csp-script-sources.txt');
  const csp = contentSecurityPolicy(loadScriptSources(sourcesFile), [
    cspOrigin(API_URL),
    cspOrigin(AGENT_URL),
  ]);
  const handler = createSiteHandler({
    browserDir: join(SERVER_DIR, '..', 'browser'),
    csp,
    allowedHosts: ALLOWED_HOSTS,
    render: renderRequest,
  });
  const server = createServer(handler);
  server.headersTimeout = HEADERS_TIMEOUT_MS;
  server.requestTimeout = HEADERS_TIMEOUT_MS;
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
  // Kubernetes stops the pod with SIGTERM: finish the open requests, then exit.
  process.once('SIGTERM', () => server.close(() => process.exit(0)));
  server.listen(port, () => console.log(`SSR server listening on http://localhost:${port}`));
}

if (isMainModule(import.meta.url)) {
  startSiteServer();
}
