import { getSite } from "./config";
import { corsHeaders, isAllowedOrigin, json } from "./http";
import { PageCounter } from "./page-counter";

export { PageCounter };

const ENDPOINT = "/v1/pageviews";
const MAX_BODY_BYTES = 1024;

async function requestData(request: Request): Promise<{ site: unknown; path: unknown } | null> {
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      reader.cancel();
      throw new Error("Request body too large");
    }

    chunks.push(value);
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder().decode(combined);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function counter(env: Env, site: string) {
  return env.PAGE_COUNTER.getByName(site);
}

async function queryCounter(env: Env, site: string, path: string, method: "GET" | "POST") {
  const url = new URL("https://counter.internal/");
  url.searchParams.set("path", path);
  const response = await counter(env, site).fetch(url, { method });
  return response.json() as Promise<{ count: number; updatedAt: number }>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (url.pathname !== ENDPOINT) return json({ error: "Not found" }, 404, origin);

    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(origin)) return json({ error: "Forbidden" }, 403, origin);
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!isAllowedOrigin(origin)) return json({ error: "Forbidden" }, 403, origin);

    if (request.method === "GET") {
      const target = getSite(url.searchParams.get("site"), origin, url.searchParams.get("path"));
      if (!target) return json({ error: "Invalid site or path" }, 400, origin);
      const result = await queryCounter(env, target.site, target.path, "GET");
      return json({ ...target, ...result }, 200, origin);
    }

    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
    const data = await requestData(request);
    const target = data && getSite(data.site, origin, data.path);
    if (!target) return json({ error: "Invalid site or path" }, 400, origin);

    const result = await queryCounter(env, target.site, target.path, "POST");
    return json({ ...target, ...result }, 200, origin);
  },
} satisfies ExportedHandler<Env>;
