import { z } from "zod";
import { getCachedCityGuide, getCityGuideCacheKey, setCachedCityGuide } from "~/lib/cityGuides/cache";
import { generateCityGuide } from "~/lib/cityGuides/generate";

const cityGuideRequestSchema = z.object({
  cityName: z.string().trim().min(1).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function POST(request: Request) {
  const body = (await request.json()) as unknown;
  const parsedRequest = cityGuideRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return Response.json(
      { error: "cityName, latitude, and longitude are required." },
      { status: 400 },
    );
  }

  const cacheKey = getCityGuideCacheKey(parsedRequest.data);
  const cachedGuide = await getCachedCityGuide(cacheKey);

  if (cachedGuide) {
    return Response.json(cachedGuide);
  }

  const guide = await generateCityGuide(parsedRequest.data);
  await setCachedCityGuide(cacheKey, guide);

  return Response.json(guide);
}
