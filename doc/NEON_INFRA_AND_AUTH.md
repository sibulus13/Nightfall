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

### Preferred on Vercel

Install Neon from the Vercel Marketplace for the linked project:

```powershell
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
