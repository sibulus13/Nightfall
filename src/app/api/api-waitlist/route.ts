import { MongoClient } from "mongodb";
import { z } from "zod";
import { getNeonSql, hasNeonDatabase } from "~/lib/neon/client";
import { ensureNeonAppSchema } from "~/lib/neon/schema";

const waitlistSchema = z.object({
  email: z.string().trim().email().max(254),
  source: z.string().trim().max(80).optional(),
});

let cachedClient: MongoClient | null = null;

export async function POST(request: Request) {
  const body = (await request.json()) as unknown;
  const parsedRequest = waitlistSchema.safeParse(body);

  if (!parsedRequest.success) {
    return Response.json(
      { ok: false, message: "Enter a valid email address." },
      { status: 400 },
    );
  }

  if (hasNeonDatabase()) {
    await ensureNeonAppSchema();

    const sql = getNeonSql();
    const now = new Date();

    await sql`
      insert into api_waitlist (email, source, created_at, updated_at)
      values (
        ${parsedRequest.data.email.toLowerCase()},
        ${parsedRequest.data.source ?? "api-doc"},
        ${now.toISOString()},
        ${now.toISOString()}
      )
      on conflict (email) do update
      set source = excluded.source,
          updated_at = excluded.updated_at
    `;

    return Response.json({
      ok: true,
      message: "You are on the API waitlist.",
      persistence: "neon",
    });
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    return Response.json({
      ok: true,
      message: "You are on the API waitlist.",
      persistence: "memory",
    });
  }

  const client = await getMongoClient(mongoUri);
  const collection = client.db().collection("api_waitlist");
  const now = new Date();

  await collection.updateOne(
    { email: parsedRequest.data.email.toLowerCase() },
    {
      $setOnInsert: {
        email: parsedRequest.data.email.toLowerCase(),
        createdAt: now,
      },
      $set: {
        source: parsedRequest.data.source ?? "api-doc",
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  return Response.json({
    ok: true,
    message: "You are on the API waitlist.",
    persistence: "mongodb",
  });
}

async function getMongoClient(uri: string): Promise<MongoClient> {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = new MongoClient(uri);
  await cachedClient.connect();

  return cachedClient;
}
