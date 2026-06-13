# Neon infrastructure and auth path

## Decision

Use Neon Postgres as the default persistence layer for app infrastructure that
needs to survive server restarts:

- API waitlist submissions
- generated city guide cache
- city guide feedback votes
- future signed-in users
- saved sunset locations
- notification subscriptions for saved sunset locations

The app still falls back gracefully when Neon is not configured:

- city guides use the existing in-memory cache
- guide feedback uses the existing in-memory counter
- API waitlist returns a successful acknowledgement, or uses MongoDB if
  `MONGODB_URI` is configured

## Provisioning options

### Current setup status

Implemented in code:

- Neon driver dependency
- lazy runtime database client
- idempotent schema creation
- direct Neon project setup script
- API waitlist persistence
- city guide cache persistence
- city guide feedback persistence
- provider-neutral user, saved-location, and notification tables
- `DATABASE_URL` and Vercel Marketplace `POSTGRES_URL` support

Still requires account-level manual setup:

- Neon account or Vercel Marketplace Neon installation
- deployment environment variables
- SSO provider activation if sign-in should be public-facing
- notification delivery providers for SMS, Discord, email, or webhooks

### Preferred on Vercel

Install Neon from the Vercel Marketplace for the linked project:

```powershell
vercel link
vercel integration add neon
vercel env pull .env.local --yes
```

Vercel-managed Neon projects usually expose `POSTGRES_URL`. The app accepts both
`POSTGRES_URL` and `DATABASE_URL`.

### Direct Neon API setup

Create a Neon API key, then run:

```powershell
$env:NEON_API_KEY = "your-neon-api-key"
npm run setup:neon -- --name nightfalls
```

Optional flags:

```powershell
npm run setup:neon -- --name nightfalls --region aws-us-west-2 --pg-version 17
```

The script creates a Neon project, waits for the database to accept connections,
applies the Nightfalls schema, and prints the `DATABASE_URL` value to configure
locally or in Vercel.

## Local setup guide

1. Install dependencies:

```powershell
npm install
```

2. Choose one database path.

Use Vercel Marketplace Neon when the repo is linked to the deployment project:

```powershell
vercel link
vercel integration add neon
vercel env pull .env.local --yes
```

Use direct Neon API setup when you want the project created from this repo:

```powershell
$env:NEON_API_KEY = "your-neon-api-key"
npm run setup:neon -- --name nightfalls
```

3. Add the printed value to `.env.local` if the script created the project:

```text
DATABASE_URL=postgresql://...
```

4. Add the map and optional AI keys:

```text
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAP_ID=
GEMINI_API_KEY=
```

5. Run the local app:

```powershell
npm run dev
```

6. Validate the Neon-backed flows:

- submit the API waitlist form
- search a city guide
- submit guide feedback
- run one of those actions twice and confirm the second city guide response is
  returned from cache

The first request can create tables automatically if the setup script was not
used.

## Production deployment guide

1. Link the local checkout to the official Vercel project:

```powershell
vercel link
```

This repository currently has no local `.vercel/project.json`, so the local
checkout is not linked until this command is completed.

2. Install Neon for the project:

```powershell
vercel integration add neon
```

If Vercel opens a browser flow, complete the Marketplace install and return to
the terminal.

3. Pull the generated env vars locally:

```powershell
vercel env pull .env.local --yes
```

4. Confirm the deployment project has these variables:

```text
POSTGRES_URL or DATABASE_URL
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_GOOGLE_MAP_ID
GEMINI_API_KEY
```

`GEMINI_API_KEY` is optional. Without it, city guides use the deterministic
fallback generator.

5. Deploy the branch or merge it to the production branch:

```powershell
vercel --prod
```

Or merge the branch into the GitHub branch connected to the production site.

6. Smoke-test production:

- open the official deployment
- submit the waitlist form
- search a city on the guide page
- submit guide feedback
- verify Neon has rows in `api_waitlist`, `city_guides`, and
  `city_guide_feedback`

## SSO setup guide

The schema is ready for SSO identities, but the sign-in UI and session middleware
are not implemented yet.

Recommended path for this app:

1. Start with Neon Auth if we want auth state and app data colocated in Neon.
2. Use Clerk if we want the fastest mature hosted SSO rollout through Vercel
   Marketplace.
3. Keep writing identities to `app_users` with:

```text
auth_provider=
auth_subject=
email=
display_name=
```

4. Once sessions exist, attach saved map pins to `saved_sunset_locations`.
5. Attach notification preferences to `sunset_notification_subscriptions`.

Do not store raw phone numbers, Discord IDs, or webhook secrets in
`sunset_notification_subscriptions`. Store provider identifiers or encrypted
secrets in a dedicated provider-backed secret store, and keep only
`destination_hash` in the app database.

## Notification delivery setup guide

The database model is ready, but actual delivery providers are still a manual
product decision:

- SMS: Twilio, AWS SNS, or another SMS provider
- Discord: Discord webhook or OAuth-connected bot
- Email: Resend, Postmark, or SendGrid
- Push/webhook: provider-specific endpoint with signed delivery

The first implementation should add:

- channel verification before enabling a subscription
- unsubscribe/disable flow
- per-user and per-destination rate limits
- a scheduled job that evaluates only the next 1-3 days
- idempotency keys so the same sunset alert is not sent twice

## Runtime variables

```text
DATABASE_URL=
POSTGRES_URL=
NEON_API_KEY=
NEON_ORG_ID=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
GEMINI_API_KEY=
MONGODB_URI=
```

`NEON_API_KEY` and `NEON_ORG_ID` are setup-time variables only. They should not
be exposed to the browser.

## Schema

The initializer creates:

- `api_waitlist`
- `city_guides`
- `city_guide_feedback`
- `app_users`
- `saved_sunset_locations`
- `sunset_notification_subscriptions`

Notification destinations are represented by `destination_hash`, not raw contact
details. The first production notification implementation should add a dedicated
encrypted secret store or provider-side identifier before sending SMS, Discord,
email, or webhook messages.

## SSO and identity

Best default for this project: start with Neon Auth if we want auth data in the
same database and want branching-friendly preview environments. Neon Auth with
Better Auth uses the database as the source of truth and needs:

```text
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
```

If we want the most mature hosted SSO surface first, use Clerk from the Vercel
Marketplace and keep Neon as the application database. The `app_users` table is
provider-neutral: it can store `auth_provider = "neon-auth"`, `"clerk"`,
`"auth0"`, or another OAuth/SSO provider later without changing saved locations
or notification subscriptions.

## Free-tier fit

Neon's current free tier is a strong POC fit for this app because the workload is
small, cache-heavy, and relational:

- 100 projects
- 100 CU-hours per month per project
- 0.5 GB storage per project
- Neon Auth up to 60K monthly active users

The likely first bottleneck is storage if we cache large generated guides or
store lots of feedback/history. Keep generated guide payloads compact and use
expiration on cache records.

## References

- Neon project management and API: https://neon.com/docs/manage/projects
- Create project API: https://api-docs.neon.tech/reference/createproject
- Neon pricing: https://neon.com/pricing
- Neon Auth: https://neon.com/docs/guides/neon-auth
- Vercel Marketplace: https://vercel.com/marketplace
