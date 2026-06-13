import { type Metadata } from "next";
import Link from "next/link";
import { FAQSchema } from "~/components/StructuredData";

export const metadata: Metadata = {
  title: "Sunset Photography FAQ | Golden Hour, Blue Hour & Spot Scouting",
  description:
    "Answers about sunset forecasts, golden hour, blue hour, Belt of Venus, sunset spot recommendations, and how Nightfalls ranks photography locations.",
  keywords:
    "sunset photography FAQ, golden hour, blue hour, Belt of Venus, sunset spot recommendations, sunset forecast accuracy, sunset planner",
  alternates: {
    canonical: "/FAQ",
  },
  openGraph: {
    title: "Sunset Photography FAQ - Nightfalls",
    description:
      "Learn how to plan sunset photos by phase, weather, viewpoint quality, and nearby spot recommendations.",
    url: "https://www.nightfalls.ca/FAQ",
  },
};

const faqSections = [
  {
    title: "Sunset Phases",
    items: [
      {
        id: "golden-hour",
        question: "What is golden hour?",
        answer:
          "Golden hour is the warm, low-angle light before sunset or after sunrise. It is usually best for portraits, foreground texture, side light, and scenes where you want warm color on the subject.",
      },
      {
        id: "sun-disk",
        question: "What is the sun disk phase?",
        answer:
          "The sun disk phase is the short window when the visible sun is close to the horizon. It is best for silhouettes, compressed telephoto compositions, clean horizon lines, and scenes where the actual circle of the sun matters.",
      },
      {
        id: "blue-hour",
        question: "What is blue hour?",
        answer:
          "Blue hour is the period after sunset when the sun is below the horizon and the sky turns cooler blue. It is especially useful for city lights, water reflections, silhouettes, and calmer contrast.",
      },
      {
        id: "belt-of-venus",
        question: "What is the Belt of Venus?",
        answer:
          "The Belt of Venus is the pink or purple band that appears opposite the sunset direction shortly after sunset. For this phase, the best composition may face away from the sun toward the antisolar sky.",
      },
      {
        id: "civil-twilight",
        question: "What is civil twilight?",
        answer:
          "Civil twilight is the brighter twilight period just after sunset, before the sky becomes fully dark. It is useful for balanced landscape detail, soft color, and photos where you still want readable foregrounds.",
      },
      {
        id: "sunset-direction",
        question: "Should I always face west for sunset photos?",
        answer:
          "No. West-facing views are important for the sun disk and classic sunset color, but Belt of Venus and blue hour can be stronger in other directions. Nightfalls separates phases so a place can be good for different reasons.",
      },
    ],
  },
  {
    title: "Forecasts and Scores",
    items: [
      {
        id: "sunset-quality-score",
        question: "How does Nightfalls predict sunset quality?",
        answer:
          "Nightfalls combines astronomical timing with forecast signals such as cloud layers, visibility, humidity, pressure, precipitation, air quality, and atmospheric stability. The score is a planning signal, not a guarantee.",
      },
      {
        id: "forecast-horizon",
        question: "How far ahead should I trust a sunset forecast?",
        answer:
          "Same-day and next-day forecasts are the most useful. Three-day forecasts are good for planning, but details can change quickly because cloud placement matters a lot near sunset.",
      },
      {
        id: "low-score-good-sunset",
        question: "Why can a low score still become a good sunset?",
        answer:
          "Sunset color can change fast when clouds open or thin at the horizon. A forecast is best used to prioritize locations and nights, while still leaving room for last-minute scouting.",
      },
    ],
  },
  {
    title: "Spot Recommendations",
    items: [
      {
        id: "spot-recommendations",
        question: "How does Nightfalls recommend sunset locations?",
        answer:
          "The recommendation model looks for map and local-reference signals such as water, elevation, viewpoints, parks, beaches, open horizons, western exposure, public access, and phase-specific fit.",
      },
      {
        id: "golden-hour-location",
        question: "What makes a good golden hour location?",
        answer:
          "A good golden hour spot usually has foreground interest, side light, public access, and enough open sky for warm light to reach the subject. Water and elevated views can help but are not always required.",
      },
      {
        id: "blue-hour-location",
        question: "What makes a good blue hour location?",
        answer:
          "A good blue hour spot often has water, skyline lights, bridges, piers, marinas, or other reflective and illuminated elements. It does not need a perfect western horizon.",
      },
      {
        id: "saved-locations",
        question: "Can I compare my own saved locations?",
        answer:
          "Yes. Use the map planner to save up to five pins, compare forecasts by date, and add recommended spots into your prediction set.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <>
      <FAQSchema />
      <main className="min-h-screen bg-[#f4f1ea] text-[#191714] dark:bg-[#151515] dark:text-[#f7f1e7]">
        <section className="mx-auto max-w-4xl px-4 py-12">
          <div className="mb-10">
            <div className="text-xs font-bold uppercase text-[#8b3d22] dark:text-[#f0a36d]">
              Field notes
            </div>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">
              Sunset photography FAQ
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#5f574f] dark:text-[#cfc4b9]">
              Practical answers for planning sunset shoots by sky phase,
              forecast quality, and location fit. Ready to scout tonight?{" "}
              <Link
                href="/App"
                className="font-semibold text-[#8b3d22] underline-offset-4 hover:underline dark:text-[#f0a36d]"
              >
                Open the planner
              </Link>
              .
            </p>
          </div>

          <div className="space-y-8">
            {faqSections.map((section) => (
              <section key={section.title}>
                <h2 className="text-2xl font-black">{section.title}</h2>
                <div className="mt-4 space-y-3">
                  {section.items.map((item) => (
                    <article
                      key={item.question}
                      id={item.id}
                      className="rounded-md border border-[#dccab8] bg-white p-5 shadow-sm dark:border-[#3d3731] dark:bg-[#211f1c]"
                    >
                      <h3 className="pb-1 text-lg font-bold">
                        {item.question}
                      </h3>
                      <p className="text-sm leading-6 text-[#61584f] dark:text-[#cfc4b9]">
                        {item.answer}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-md border border-[#d3bda5] bg-[#fffaf2] p-5 dark:border-[#3b342e] dark:bg-[#1d1b18]">
            <h2 className="text-xl font-black">Start with a local guide</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/locations/vancouver-bc"
                className="rounded-md border border-[#b89f86] px-3 py-2 text-sm font-semibold hover:bg-white/70 dark:border-[#51483f] dark:hover:bg-white/10"
              >
                Vancouver
              </Link>
              <Link
                href="/locations/surrey-bc"
                className="rounded-md border border-[#b89f86] px-3 py-2 text-sm font-semibold hover:bg-white/70 dark:border-[#51483f] dark:hover:bg-white/10"
              >
                Surrey
              </Link>
              <Link
                href="/locations/coquitlam-bc"
                className="rounded-md border border-[#b89f86] px-3 py-2 text-sm font-semibold hover:bg-white/70 dark:border-[#51483f] dark:hover:bg-white/10"
              >
                Coquitlam
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
