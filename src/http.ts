import { SITES } from "./config";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
};

export function isAllowedOrigin(origin: string | null): origin is string {
  return origin !== null && Object.values(SITES).some((site) => site.origin === origin);
}

export function corsHeaders(origin: string | null): HeadersInit {
  if (!isAllowedOrigin(origin)) return { ...JSON_HEADERS, Vary: "Origin" };
  return {
    ...JSON_HEADERS,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(origin) });
}
