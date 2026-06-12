import { neon } from "@neondatabase/serverless";

const NEON_API_BASE_URL = "https://console.neon.tech/api/v2";
const DEFAULT_PROJECT_NAME = "nightfalls";
const DEFAULT_POSTGRES_VERSION = 17;
const MAX_SCHEMA_ATTEMPTS = 12;
const SCHEMA_RETRY_DELAY_MS = 2500;

const options = parseArgs(process.argv.slice(2));
const apiKey = process.env.NEON_API_KEY;

if (!apiKey) {
  throw new Error("NEON_API_KEY is required to create a Neon project.");
}

const projectPayload = {
  project: {
    name: options.name ?? DEFAULT_PROJECT_NAME,
    pg_version: Number(options.pgVersion ?? DEFAULT_POSTGRES_VERSION),
    ...(options.region ? { region_id: options.region } : {}),
    ...(process.env.NEON_ORG_ID ? { org_id: process.env.NEON_ORG_ID } : {}),
  },
};

const createProjectResponse = await fetch(`${NEON_API_BASE_URL}/projects`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(projectPayload),
});

if (!createProjectResponse.ok) {
  const errorText = await createProjectResponse.text();
  throw new Error(
    `Neon project creation failed (${createProjectResponse.status}): ${errorText}`,
  );
}

const project = await createProjectResponse.json();
const databaseUrl = findConnectionUri(project);

if (!databaseUrl) {
  throw new Error("Neon project was created, but no connection URI was found.");
}

await applySchemaWithRetry(databaseUrl);

console.log("Neon project created and Nightfalls schema applied.");
console.log(`Project ID: ${project.project?.id ?? "unknown"}`);
console.log("Set this environment variable:");
console.log(`DATABASE_URL=${databaseUrl}`);

function parseArgs(args) {
  const parsedOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextArg = args[index + 1];

    if (arg === "--name" && nextArg) {
      parsedOptions.name = nextArg;
      index += 1;
    } else if (arg === "--region" && nextArg) {
      parsedOptions.region = nextArg;
      index += 1;
    } else if (arg === "--pg-version" && nextArg) {
      parsedOptions.pgVersion = nextArg;
      index += 1;
    }
  }

  return parsedOptions;
}

function findConnectionUri(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const uri = findConnectionUri(item);

      if (uri) {
        return uri;
      }
    }

    return null;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (
      typeof entry === "string" &&
      key.toLowerCase().includes("uri") &&
      entry.startsWith("postgres")
    ) {
      return entry;
    }

    const nestedUri = findConnectionUri(entry);

    if (nestedUri) {
      return nestedUri;
    }
  }

  return null;
}

async function applySchemaWithRetry(databaseUrl) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_SCHEMA_ATTEMPTS; attempt += 1) {
    try {
      await applySchema(databaseUrl);
      return;
    } catch (error) {
      lastError = error;
      await delay(SCHEMA_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

async function applySchema(databaseUrl) {
  const sql = neon(databaseUrl);

  await sql`create extension if not exists pgcrypto`;

  await sql`
    create table if not exists api_waitlist (
      email text primary key,
      source text not null default 'api-doc',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists city_guides (
      cache_key text primary key,
      city_name text not null,
      latitude double precision not null,
      longitude double precision not null,
      guide_json jsonb not null,
      provider text not null,
      generated_at timestamptz not null,
      expires_at timestamptz not null,
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists city_guide_feedback (
      guide_id text primary key,
      thumbs_up integer not null default 0,
      thumbs_down integer not null default 0,
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists app_users (
      id uuid primary key default gen_random_uuid(),
      auth_provider text not null,
      auth_subject text not null,
      email text,
      display_name text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (auth_provider, auth_subject)
    )
  `;

  await sql`
    create table if not exists saved_sunset_locations (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references app_users(id) on delete cascade,
      label text not null,
      place_id text,
      city_name text,
      latitude double precision not null,
      longitude double precision not null,
      tags text[] not null default '{}',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists sunset_notification_subscriptions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references app_users(id) on delete cascade,
      saved_location_id uuid not null references saved_sunset_locations(id) on delete cascade,
      channel text not null check (channel in ('email', 'sms', 'discord', 'webhook')),
      destination_hash text not null,
      days_ahead integer not null default 3 check (days_ahead between 1 and 3),
      lead_time_minutes integer not null default 60 check (lead_time_minutes between 0 and 1440),
      enabled boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create index if not exists saved_sunset_locations_user_id_idx
    on saved_sunset_locations(user_id)
  `;

  await sql`
    create index if not exists sunset_notification_subscriptions_user_id_idx
    on sunset_notification_subscriptions(user_id)
  `;

  await sql`
    create index if not exists sunset_notification_subscriptions_location_id_idx
    on sunset_notification_subscriptions(saved_location_id)
  `;
}

function delay(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
