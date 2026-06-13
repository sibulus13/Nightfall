import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Clock, Compass, MapPin, Mountain, Waves } from "lucide-react";
import CityGuideSearch from "~/components/cityGuideSearch";
import {
  getRankedSunsetRegion,
  getRankedSunsetRegions,
} from "~/lib/regions/sunsetRegions";

interface RegionPageProps {
  params: {
    slug: string;
  };
}

const sunsetPhaseExplainers = [
  {
    label: "Golden hour",
    href: "/FAQ#golden-hour",
    description:
      "Warm, low-angle light before sunset; best for portraits, foreground texture, and side-lit landscapes.",
  },
  {
    label: "Sun disk",
    href: "/FAQ#sun-disk",
    description:
      "The short horizon window when the visible sun itself is the subject for silhouettes or telephoto compression.",
  },
  {
    label: "Belt of Venus",
    href: "/FAQ#belt-of-venus",
    description:
      "A pink-purple band opposite the sunset direction, often strongest shortly after the sun drops.",
  },
  {
    label: "Blue hour",
    href: "/FAQ#blue-hour",
    description:
      "Cool twilight after sunset; useful for water reflections, skyline lights, silhouettes, and calmer contrast.",
  },
];

export function generateStaticParams(): Array<{ slug: string }> {
  return getRankedSunsetRegions().map((region) => ({ slug: region.slug }));
}

export function generateMetadata({ params }: RegionPageProps): Metadata {
  const region = getRankedSunsetRegion(params.slug);

  if (!region) {
    return {};
  }

  const title = `Best Sunset Spots in ${region.areaLabel} | Nightfalls`;
  const description = `Scout ${region.areaLabel} sunset photography spots by golden hour, blue hour, Belt of Venus, water reflections, and viewpoint quality.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/locations/${region.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.nightfalls.ca/locations/${region.slug}`,
      siteName: "Nightfalls",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function RegionPage({ params }: RegionPageProps) {
  const region = getRankedSunsetRegion(params.slug);

  if (!region) {
    notFound();
  }

  const topSpot = region.spots[0];
  const appHref = `/App?lat=${region.latitude}&lon=${region.longitude}&tab=map`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Best sunset photography spots in ${region.areaLabel}`,
    description: region.intro,
    itemListElement: region.spots.map((spot, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Place",
        name: spot.name,
        geo: {
          "@type": "GeoCoordinates",
          latitude: spot.latitude,
          longitude: spot.longitude,
        },
        description: `${spot.name} is recommended for ${spot.recommendedFor.join(
          ", ",
        )}.`,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#191714] dark:bg-[#151515] dark:text-[#f7f1e7]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-[minmax(0,1fr)_320px] md:py-14">
        <div>
          <Link
            href="/"
            className="mb-5 inline-flex text-sm font-medium text-[#8b3d22] underline-offset-4 hover:underline dark:text-[#f0a36d]"
          >
            Nightfalls field guide
          </Link>
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
            Best sunset spots in {region.areaLabel}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#514a42] dark:text-[#d8cfc2] md:text-lg">
            {region.intro}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {region.bestFor.map((label) => (
              <span
                key={label}
                className="rounded-full border border-[#caa887] bg-white/70 px-3 py-1 text-xs font-semibold text-[#3d3128] dark:border-[#59483a] dark:bg-white/10 dark:text-[#f3deca]"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={appHref}
              className="inline-flex items-center gap-2 rounded-md bg-[#181411] px-4 py-2 text-sm font-semibold text-white hover:bg-[#34281f] dark:bg-[#f4d2ad] dark:text-[#191714]"
            >
              <MapPin className="h-4 w-4" />
              Open this area in the app
            </Link>
            <Link
              href="/App"
              className="inline-flex items-center gap-2 rounded-md border border-[#b89f86] px-4 py-2 text-sm font-semibold text-[#2b241f] hover:bg-white/60 dark:border-[#5c5045] dark:text-[#f5e8dc] dark:hover:bg-white/10"
            >
              <Compass className="h-4 w-4" />
              Compare saved pins
            </Link>
          </div>
        </div>

        <aside className="self-start rounded-md border border-[#d9c8b6] bg-white/70 p-4 shadow-sm dark:border-[#3f3933] dark:bg-white/10">
          <div className="text-xs font-semibold uppercase text-[#8b3d22] dark:text-[#f0a36d]">
            Fast read
          </div>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-[#70675f] dark:text-[#beb2a6]">Top pick</dt>
              <dd className="font-semibold">{topSpot?.name ?? region.name}</dd>
            </div>
            <div>
              <dt className="text-[#70675f] dark:text-[#beb2a6]">
                Strongest phases
              </dt>
              <dd className="font-semibold">
                {region.topPhases.join(", ") || region.bestFor.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-[#70675f] dark:text-[#beb2a6]">
                Common qualities
              </dt>
              <dd className="font-semibold">
                {region.topSceneQualities.join(", ") || "Open horizon"}
              </dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="border-y border-[#ded0c0] bg-[#fffaf2] dark:border-[#34302b] dark:bg-[#1d1b18]">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 md:grid-cols-3">
          {region.scoutingNotes.map((note, index) => {
            const Icon = index === 0 ? Waves : index === 1 ? Mountain : Clock;

            return (
              <div key={note} className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#253f3d] text-white dark:bg-[#6aa29b] dark:text-[#101615]">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm leading-6 text-[#554c43] dark:text-[#d8cec3]">
                  {note}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="nf-section-label">Phase guide</div>
            <h2 className="mt-2 text-2xl font-black">
              Why each sunset phase changes the shot
            </h2>
          </div>
          <Link
            href="/FAQ"
            className="text-sm font-semibold text-[#8b3d22] underline-offset-4 hover:underline dark:text-[#f0a36d]"
          >
            Read the full sunset FAQ
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {sunsetPhaseExplainers.map((phase) => (
            <Link
              key={phase.label}
              href={phase.href}
              className="rounded-md border border-[#dccab8] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-[#3d3731] dark:bg-[#211f1c]"
            >
              <div className="text-sm font-black text-[#8b3d22] dark:text-[#f0a36d]">
                {phase.label}
              </div>
              <p className="mt-2 text-xs leading-5 text-[#625850] dark:text-[#cfc4b9]">
                {phase.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <CityGuideSearch />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Recommended viewpoints</h2>
            <p className="text-sm text-[#6b6259] dark:text-[#bfb4a9]">
              Ranked by scenic value, western exposure, access, references, and
              phase-specific fit.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {region.spots.map((spot) => (
            <article
              key={spot.id}
              className="rounded-md border border-[#dccab8] bg-white p-4 shadow-sm dark:border-[#3d3731] dark:bg-[#211f1c]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="pb-0 text-lg font-black">{spot.name}</h3>
                  <p className="mt-1 text-sm text-[#6b6259] dark:text-[#beb4aa]">
                    Best for {spot.recommendedFor.join(", ")}
                  </p>
                </div>
                <span className="rounded-md bg-[#253f3d] px-2 py-1 text-sm font-bold text-white dark:bg-[#6aa29b] dark:text-[#101615]">
                  {spot.totalScore}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Metric label="Golden hour" value={spot.phaseScores.goldenHour} />
                <Metric label="Sun disk" value={spot.phaseScores.sunDisk} />
                <Metric label="Belt of Venus" value={spot.phaseScores.beltOfVenus} />
                <Metric label="Blue hour" value={spot.phaseScores.blueHour} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {spot.qualificationBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full bg-[#efe1d1] px-2 py-0.5 text-[10px] font-semibold text-[#4b392c] dark:bg-white/10 dark:text-[#f1ddc8]"
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <SunsetPhaseTimeline
                bestPhase={spot.bestPhase}
                arriveBy={spot.goldenHour.arriveBy}
                goldenHourStart={spot.goldenHour.start}
                sunsetTime={spot.goldenHour.end}
              />
              <div className="mt-3 flex items-center gap-2 text-xs text-[#6b6259] dark:text-[#bfb4a9]">
                <Camera className="h-3.5 w-3.5" />
                Sunset {spot.viewingDirections.sunsetAzimuthDegrees} deg,
                Belt of Venus {spot.viewingDirections.antisolarAzimuthDegrees} deg
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="text-2xl font-black">Nearby sunset guides</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {region.nearbySlugs.map((slug) => {
            const nearbyRegion = getRankedSunsetRegion(slug);

            if (!nearbyRegion) {
              return null;
            }

            return (
              <Link
                key={slug}
                href={`/locations/${slug}`}
                className="rounded-md border border-[#bda58d] px-3 py-2 text-sm font-semibold hover:bg-white/70 dark:border-[#51483f] dark:hover:bg-white/10"
              >
                {nearbyRegion.areaLabel}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function SunsetPhaseTimeline({
  bestPhase,
  arriveBy,
  goldenHourStart,
  sunsetTime,
}: {
  bestPhase:
    | "goldenHour"
    | "sunDisk"
    | "beltOfVenus"
    | "civilTwilight"
    | "blueHour";
  arriveBy: string;
  goldenHourStart: string;
  sunsetTime: string;
}) {
  const phase = phaseTimelineDetails[bestPhase];

  return (
    <div className="mt-4 rounded-md border border-[#ead8c8] bg-[#fff8f0] p-3 dark:border-white/10 dark:bg-white/5">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <div>
          <div className="text-[10px] font-bold uppercase text-muted-foreground">
            Best visit window
          </div>
          <div className="font-semibold">
            {phase.label} · arrive by {formatRegionTime(arriveBy)}
          </div>
        </div>
        <div className="text-right text-[10px] font-semibold uppercase text-[#8b3d22] dark:text-[#f0a36d]">
          Peak fit
        </div>
      </div>
      <div className="relative h-3 rounded-full bg-[linear-gradient(90deg,#f59e0b_0%,#fb923c_24%,#f97316_43%,#ec4899_62%,#8b5cf6_78%,#1d4ed8_100%)] shadow-inner">
        <div
          className="absolute top-1/2 h-6 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_2px_rgba(35,27,23,0.75)] dark:shadow-[0_0_0_2px_rgba(255,255,255,0.85)]"
          style={{ left: `${phase.position}%` }}
          title={`${phase.label} is the best phase for this spot`}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-muted-foreground">
        <span>{formatRegionTime(goldenHourStart)}</span>
        <span>Sunset {formatRegionTime(sunsetTime)}</span>
        <span>Afterglow</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-[#f5eee5] p-2 dark:bg-white/10">
      <div className="text-[10px] uppercase text-[#746a61] dark:text-[#bfb4a9]">
        {label}
      </div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

const phaseTimelineDetails = {
  goldenHour: {
    label: "Golden hour",
    position: 16,
  },
  sunDisk: {
    label: "Sun disk",
    position: 43,
  },
  beltOfVenus: {
    label: "Belt of Venus",
    position: 68,
  },
  civilTwilight: {
    label: "Civil twilight",
    position: 78,
  },
  blueHour: {
    label: "Blue hour",
    position: 91,
  },
} as const;

function formatRegionTime(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
