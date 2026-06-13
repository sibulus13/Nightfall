import type {
  LocationReferenceImage,
  SunsetLocationCandidate,
} from "./types";

interface WikipediaSummary {
  title?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
  thumbnail?: {
    source?: string;
  };
}

export async function enrichCandidatesWithReferenceImages(
  candidates: SunsetLocationCandidate[],
): Promise<SunsetLocationCandidate[]> {
  return Promise.all(
    candidates.map(async (candidate) => {
      const image = await getWikipediaReferenceImage(candidate);

      if (!image) {
        return candidate;
      }

      return {
        ...candidate,
        referenceImages: [...(candidate.referenceImages ?? []), image],
        photoReferenceCount: Math.max(candidate.photoReferenceCount, 1),
      };
    }),
  );
}

async function getWikipediaReferenceImage(
  candidate: SunsetLocationCandidate,
): Promise<LocationReferenceImage | null> {
  const wikipediaReference = candidate.references.find((reference) =>
    reference.url.includes("wikipedia.org/wiki/"),
  );

  if (!wikipediaReference) {
    return null;
  }

  const pageTitle = getWikipediaPageTitle(wikipediaReference.url);

  if (!pageTitle) {
    return null;
  }

  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        pageTitle,
      )}`,
      {
        next: {
          revalidate: 60 * 60 * 24 * 7,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const summary = (await response.json()) as WikipediaSummary;
    const pageUrl = summary.content_urls?.desktop?.page ?? wikipediaReference.url;

    return {
      title: summary.title ?? candidate.name,
      pageUrl,
      thumbnailUrl: summary.thumbnail?.source,
      attribution: "Wikipedia contributors",
      license: "See source page",
    };
  } catch (error) {
    console.error("Wikipedia image enrichment failed:", error);
    return null;
  }
}

function getWikipediaPageTitle(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const title = parsedUrl.pathname.split("/wiki/")[1];

    return title ? decodeURIComponent(title) : null;
  } catch {
    return null;
  }
}

