import { getNeonSql } from "./client";

let schemaReadyPromise: Promise<void> | null = null;

export function ensureNeonAppSchema(): Promise<void> {
  schemaReadyPromise ??= createNeonAppSchema();
  return schemaReadyPromise;
}

async function createNeonAppSchema(): Promise<void> {
  const sql = getNeonSql();

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
