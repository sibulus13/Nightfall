import { goldenCheckCandidates } from "./fixtures";
import { getDistanceMeters, type Coordinate } from "./geo";
import type {
  LocationReference,
  LocationReferenceImage,
  SunsetLocationCandidate,
} from "./types";

const VALIDATED_MATCH_RADIUS_METERS = 250;

export function getNearbyValidatedCandidates(
  center: Coordinate,
  radiusMeters: number,
): SunsetLocationCandidate[] {
  return goldenCheckCandidates.filter((candidate) => {
    const distanceMeters = getDistanceMeters(center, candidate);

    return distanceMeters <= radiusMeters;
  });
}

export function mergeValidatedReferences(
  candidate: SunsetLocationCandidate,
): SunsetLocationCandidate {
  const validatedCandidate = goldenCheckCandidates.find((goldenCandidate) => {
    const sameName =
      normalizeName(goldenCandidate.name) === normalizeName(candidate.name);
    const nearby =
      getDistanceMeters(goldenCandidate, candidate) <=
      VALIDATED_MATCH_RADIUS_METERS;

    return sameName || nearby;
  });

  if (!validatedCandidate) {
    return candidate;
  }

  return {
    ...candidate,
    sources: Array.from(
      new Set([...candidate.sources, ...validatedCandidate.sources]),
    ),
    references: mergeReferences(candidate.references, validatedCandidate.references),
    referenceImages: mergeReferenceImages(
      candidate.referenceImages,
      validatedCandidate.referenceImages,
    ),
    photoReferenceCount: Math.max(
      candidate.photoReferenceCount,
      validatedCandidate.photoReferenceCount,
    ),
  };
}

function mergeReferences(
  currentReferences: LocationReference[],
  validatedReferences: LocationReference[],
): LocationReference[] {
  const references = new Map<string, LocationReference>();

  [...currentReferences, ...validatedReferences].forEach((reference) => {
    references.set(reference.url, reference);
  });

  return Array.from(references.values());
}

function mergeReferenceImages(
  currentImages: LocationReferenceImage[] | undefined,
  validatedImages: LocationReferenceImage[] | undefined,
): LocationReferenceImage[] | undefined {
  const images = new Map<string, LocationReferenceImage>();

  [...(currentImages ?? []), ...(validatedImages ?? [])].forEach((image) => {
    images.set(image.pageUrl, image);
  });

  return images.size > 0 ? Array.from(images.values()) : undefined;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

