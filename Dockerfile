# Stage 0: build the app. It runs on the build platform (--platform=$BUILDPLATFORM): the output
# is JavaScript and HTML, the same for every target platform, so it is built once and natively.
# An empty API_URL or AGENT_URL (unset CI secret) falls back to production (scripts/ng.mjs).
FROM --platform=$BUILDPLATFORM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS build
RUN npm install -g pnpm@12.6.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG API_URL=
ARG AGENT_URL=
RUN pnpm build

# Stage 1: render the server-rendered routes once with the built server, so their inline
# scripts (Angular's event-replay bootstrap, whose event list differs from the home's) get
# their own CSP hashes. The scripts depend on the page components, not on the content. It
# runs once, on the build platform: run per target platform in parallel, the renders shared
# the builder's network (release 4.0.0 failed on a port collision). The server also checks
# here that API_URL and AGENT_URL are plain http(s) origins, so an invalid one fails the build.
FROM --platform=$BUILDPLATFORM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS ssr-pages
COPY --from=build /app/dist/devsonic.cl/server /app/server
COPY --from=build /app/dist/devsonic.cl/browser /app/browser
COPY docker/render-ssr-pages.mjs /app/
RUN node /app/render-ssr-pages.mjs /app/server/server.mjs /pages

# Stage 2: compute the CSP hashes of the inline scripts of the prerendered site and the
# server-rendered pages. The server reads them on start (server/csp-script-sources.txt).
FROM --platform=$BUILDPLATFORM perl:5-slim@sha256:a0c68e9afd12dc9a10c0693f1dacac08e93d41a9e2f43aefc3a209c53e5147d2 AS csp
COPY --from=build /app/dist/devsonic.cl/browser /site
COPY --from=ssr-pages /pages /ssr-pages
COPY docker/csp-hashes.pl /work/
RUN echo '__CSP_SCRIPT_HASHES__' > /work/csp-script-sources.txt \
 && perl /work/csp-hashes.pl /site /ssr-pages /work/csp-script-sources.txt

# Final image: one unprivileged Node process serving the prerendered pages and static files,
# rendering /projects, /experience and /blog (and their /es versions) on demand, with the
# security headers, cache policy and language redirect that nginx used to apply.
FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94
ENV NODE_ENV=production PORT=8080
# Alpine fixes published after the base image, and no npm/npx: the server only runs `node`, and
# the bundled npm only adds packages to patch.
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx
WORKDIR /app
# Owned by root, so the `node` user can't change the files it serves.
COPY --from=build --chown=root:root /app/dist/devsonic.cl/server ./server
COPY --from=build --chown=root:root /app/dist/devsonic.cl/browser ./browser
COPY --from=csp --chown=root:root /work/csp-script-sources.txt ./server/
USER node
EXPOSE 8080
# The health probe answers on any host, so it uses the container's own address.
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "server/server.mjs"]
