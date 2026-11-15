# Marco Figueroa

Hi, I'm Marco Figueroa — a full-stack developer working with Angular, Node.js, and Kubernetes. I build web apps and run the servers behind them.

## About me

I'm a software engineer and system administrator based in Santiago, Chile, with 3 years of experience supporting and operating critical systems — Windows, Linux, databases and TLS/SSL certificates.

Today I build AI-powered solutions with Python, FastAPI, LangGraph and Next.js, and I work across the stack with Angular, Node.js and TypeScript, backed by CI/CD pipelines, Docker and Kubernetes.

I enjoy understanding the whole picture: how the code is written, how it's deployed and how it keeps running in production.

## Experience

| Period              | Role                                         | Company       | Technologies                                      |
| ------------------- | -------------------------------------------- | ------------- | ------------------------------------------------- |
| Sep 2026 — Present  | Intern — Systems & Technology, AI Solutions  | Autofin Chile | Python, FastAPI, LangGraph, Next.js, Jira         |
| Mar 2025 — Apr 2025 | Technical Support Agent                      | E-Cert Chile  | Technical Support, Incident Management            |
| Jul 2023 — Oct 2024 | TLS/SSL Operator — System Administrator      | E-SIGN S.A.   | Linux, Windows Server, TLS/SSL, Kubernetes, CI/CD |
| Dec 2021 — Apr 2023 | Customer Service — Technical & Sales Support | E-SIGN S.A.   | Technical Support, Customer Service               |

## Contact

- **Email:** [marco@figueroa-sanchez.com](mailto:marco@figueroa-sanchez.com)
- **Website:** [marco.figueroa-sanchez.com](https://marco.figueroa-sanchez.com)
- **LinkedIn:** [mfigueroa23](https://www.linkedin.com/in/mfigueroa23)
- **Location:** Santiago, Chile

## Forms

- **Contact:** the contact section sends messages to the API (`POST /contact`).
- **Testimonials:** once the home page is interactive, the testimonials section shows a "Leave a testimonial" button that opens a dialog with the testimonial form (name, role, email and testimonial). It posts to the API (`POST /testimonials`); a submitted testimonial stays hidden until the owner approves it in the panel. Testimonials without a photo show the author's initials.

## Languages

The site is in English at its usual URLs and in Spanish under `/es` (for example `/es`, `/es/blog`, `/es/blog/rss.xml`). The interface texts live in typed dictionaries (`src/app/core/i18n/`), and the content comes from the API in the page's language; an item without a Spanish version is shown in English. The EN/ES switch in the navigation opens the same page in the other language and remembers the choice in a `lang` cookie for 365 days. On a first visit (no `lang` cookie) from a browser whose first language is Spanish, the server redirects the English pages to their `/es` equivalent with a temporary `302`; those responses are marked `private` and `Vary: Accept-Language, Cookie` so shared caches don't reuse them. Feeds, files and assets are never redirected.

## Deployment

The site is one Docker image and runs as one container (`portfolio`) of `deployment/portfolio` (namespace `portfolio`): an unprivileged Node server (`node server/server.mjs`) on port 8080 that

- serves the prerendered homes (`/`, `/es`) and the static files of the build,
- renders `/projects`, `/experience` and `/blog` (and their `/es` versions) and the RSS feeds on demand,
- sends the security headers (CSP with the hashes of every inline script, computed when the image is built), the cache policy and the first-visit language redirect, and answers the health probe on `/healthz`.

TLS is terminated by the Ingress. The server writes nothing to disk, so the container can run with a read-only root filesystem.

### CI/CD

- `Testing` (`.github/workflows/testing.yaml`): lint, format, unit tests, build and the SSR CSP check on every PR to `main`.
- `Security` (`.github/workflows/security.yaml`): CodeQL, SonarQube Cloud, OSV-Scanner, Dependency Review and Docker Scout on PRs, daily and on demand.
- `Release` (`.github/workflows/release.yaml`): every push to `main` builds the multi-platform image, scans it, tags it with the version in `package.json` and `latest`, and sets the container by digest.

Repository settings the workflows need:

- Variables: `DOCKERHUB_ORGANIZATION`, `DOCKERHUB_USERNAME`, `DOCKER_IMAGE`.
- Secrets: `DOCKERHUB_TOKEN`, `SONAR_TOKEN`, `API_URL`, `AGENT_URL`, `TWINGATE_SERVICE_KEY`.
- Environment `production` (deployments from `main` only) with the secret `KUBE_CONFIG`.

### Moving from the nginx + SSR sidecar pod

Before the first release with the single image, remove the `ssr` sidecar from `deployment/portfolio`; the `portfolio` container keeps port 8080, so the Service and the Ingress don't change:

```yaml
containers:
  - name: portfolio
    image: <dockerhub-organization>/<image>:latest
    ports:
      - containerPort: 8080
    readinessProbe:
      httpGet:
        path: /healthz
        port: 8080
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
```

The `portfolio-ssr` Docker Hub repository is no longer published.
