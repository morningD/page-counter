export interface SiteConfig {
  origin: string
  pathPrefix: string
}

export const SITES: Record<string, SiteConfig> = {
  "lang-csconf": {
    origin: "https://morningd.github.io",
    pathPrefix: "/lang.csconf",
  },
}

const MAX_PATH_LENGTH = 512

export function normalizePath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > MAX_PATH_LENGTH) {
    return null
  }
  if (value.includes("?") || value.includes("#") || value.includes("\\") || /(?:^|\/)\.\.(?:\/|$)/.test(value)) {
    return null
  }

  try {
    const decoded = decodeURIComponent(value)
    if (decoded.includes("\\") || /(?:^|\/)\.\.(?:\/|$)/.test(decoded)) return null
  } catch {
    return null
  }

  const normalized = value.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/"
  return normalized
}

export function getSite(site: unknown, origin: string | null, path: unknown): { site: string; path: string } | null {
  if (typeof site !== "string" || origin === null) return null
  const config = SITES[site]
  const normalizedPath = normalizePath(path)
  if (!config || config.origin !== origin || !normalizedPath) return null
  if (normalizedPath !== config.pathPrefix && !normalizedPath.startsWith(`${config.pathPrefix}/`)) return null
  return { site, path: normalizedPath }
}
