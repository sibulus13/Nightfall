import { neon } from "@neondatabase/serverless";

type NeonSql = ReturnType<typeof neon>;

let cachedSql: NeonSql | null = null;

export function hasNeonDatabase(): boolean {
  return Boolean(getNeonDatabaseUrl());
}

export function getNeonSql(): NeonSql {
  const databaseUrl = getNeonDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL or POSTGRES_URL is not configured.");
  }

  if (!cachedSql) {
    cachedSql = neon(databaseUrl);
  }

  return cachedSql;
}

function getNeonDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
}
