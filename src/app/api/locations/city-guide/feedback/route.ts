import { z } from "zod";
import type {
  CityGuideFeedbackRequest,
  CityGuideFeedbackResponse,
} from "~/types/cityGuide";
import { getNeonSql, hasNeonDatabase } from "~/lib/neon/client";
import { ensureNeonAppSchema } from "~/lib/neon/schema";

const feedbackSchema = z.object({
  guideId: z.string().trim().min(1).max(160),
  rating: z.enum(["up", "down"]),
});

const feedbackCounts = new Map<string, { up: number; down: number }>();

export async function POST(request: Request) {
  const body = (await request.json()) as CityGuideFeedbackRequest;
  const parsedFeedback = feedbackSchema.safeParse(body);

  if (!parsedFeedback.success) {
    return Response.json(
      { error: "guideId and rating are required." },
      { status: 400 },
    );
  }

  if (hasNeonDatabase()) {
    await ensureNeonAppSchema();

    const sql = getNeonSql();

    if (parsedFeedback.data.rating === "up") {
      await sql`
        insert into city_guide_feedback (guide_id, thumbs_up, thumbs_down, updated_at)
        values (${parsedFeedback.data.guideId}, 1, 0, ${new Date().toISOString()})
        on conflict (guide_id) do update
        set thumbs_up = city_guide_feedback.thumbs_up + 1,
            updated_at = excluded.updated_at
      `;
    } else {
      await sql`
        insert into city_guide_feedback (guide_id, thumbs_up, thumbs_down, updated_at)
        values (${parsedFeedback.data.guideId}, 0, 1, ${new Date().toISOString()})
        on conflict (guide_id) do update
        set thumbs_down = city_guide_feedback.thumbs_down + 1,
            updated_at = excluded.updated_at
      `;
    }
  } else {
    const currentCounts =
      feedbackCounts.get(parsedFeedback.data.guideId) ?? { up: 0, down: 0 };
    currentCounts[parsedFeedback.data.rating] += 1;
    feedbackCounts.set(parsedFeedback.data.guideId, currentCounts);
  }

  const response: CityGuideFeedbackResponse = {
    ok: true,
    guideId: parsedFeedback.data.guideId,
    rating: parsedFeedback.data.rating,
  };

  return Response.json(response);
}
