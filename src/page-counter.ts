import type { CounterResult } from "./types";

const SITE_TOTAL_KEY = "__site_total__";
type CounterRow = Record<string, SqlStorageValue> & CounterResult;

export class PageCounter implements DurableObject {
  constructor(private readonly ctx: DurableObjectState) {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS page_counts (
        path TEXT PRIMARY KEY NOT NULL,
        count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
        updated_at INTEGER NOT NULL
      )
    `);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.searchParams.get("path");
    if (!path) return Response.json({ error: "Missing path" }, { status: 400 });

    if (request.method === "POST") {
      return Response.json(await this.increment(path));
    }
    if (request.method === "GET") {
      return Response.json(await this.read(path));
    }
    return new Response(null, { status: 405 });
  }

  private increment(path: string): CounterResult {
    const updatedAt = Date.now();
    const sql = this.ctx.storage.sql;
    return this.ctx.storage.transactionSync(() => {
      const total = sql
        .exec<CounterRow>("SELECT count, updated_at AS updatedAt FROM page_counts WHERE path = ?", SITE_TOTAL_KEY)
        .toArray()[0] ?? null;
      const historicalTotal = sql
        .exec<CounterRow>(
          "SELECT COALESCE(SUM(count), 0) AS count, ? AS updatedAt FROM page_counts WHERE path != ?",
          updatedAt,
          SITE_TOTAL_KEY,
        )
        .toArray()[0] ?? { count: 0, updatedAt };
      if (!total) {
        sql.exec(
          "INSERT INTO page_counts (path, count, updated_at) VALUES (?, ?, ?)",
          SITE_TOTAL_KEY,
          historicalTotal.count,
          updatedAt,
        );
      }

      sql.exec(
        `INSERT INTO page_counts (path, count, updated_at)
         VALUES (?, 1, ?)
         ON CONFLICT(path) DO UPDATE SET
           count = page_counts.count + 1,
           updated_at = excluded.updated_at`,
        path,
        updatedAt,
      );
      return sql
        .exec<CounterRow>(
          `UPDATE page_counts
           SET count = count + 1, updated_at = ?
           WHERE path = ?
           RETURNING count, updated_at AS updatedAt`,
          updatedAt,
          SITE_TOTAL_KEY,
        )
        .one();
    });
  }

  private read(path: string): CounterResult {
    return this.ctx.storage.sql
      .exec<CounterRow>(
        "SELECT count, updated_at AS updatedAt FROM page_counts WHERE path = ?",
        path,
      )
      .one() ?? { count: 0, updatedAt: 0 };
  }
}
