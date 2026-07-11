# page-counter

A shared Cloudflare Worker + SQLite-backed Durable Object page-view counter for static GitHub Pages projects.

## API

```text
POST /v1/pageviews
GET  /v1/pageviews?site={site}&path={path}
```

The Worker validates the browser origin, site ID, and project path prefix before forwarding to a per-site Durable Object. It stores only a normalized page path, aggregate count, and update timestamp.

## Add a project

Register a stable site ID in `src/config.ts`:

```ts
"lang-csconf": {
  origin: "https://morningd.github.io",
  pathPrefix: "/lang.csconf",
}
```

Each site receives a separate Durable Object instance. Query strings and URL fragments are not counted.

## Local development

```bash
npm install
npm run cf-typegen
npm run typecheck
npm run dev
```

## Deploy

Authenticate interactively once:

```bash
wrangler login
```

Then deploy:

```bash
npm run deploy
```

For CI, configure a least-privilege `CLOUDFLARE_API_TOKEN` secret. Never commit that token.

## Counter semantics

This is a public, approximate page-view counter. It can validate browser origins and paths, but a public write API cannot fully prevent deliberate scripted traffic. It intentionally stores no IP addresses, user agents, referrers, query strings, fragments, or per-visit events.
