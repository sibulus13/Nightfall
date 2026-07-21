/**
 * Educational context about sunsets for the `sunset_guide` MCP tool — the phases,
 * what makes a sunset good, and how Nightfalls scores + recommends. This is the
 * "all the info we have as context" surface the assistant can draw on.
 */

interface KnowledgeEntry {
  topic: string;
  keywords: string[];
  body: string;
}

const KNOWLEDGE: KnowledgeEntry[] = [
  {
    topic: "The five phases of a sunset",
    keywords: ["phase", "phases", "sequence", "timeline", "stages"],
    body: [
      "A sunset unfolds in five phases, each peaking at a different time and wanting a different horizon:",
      "• Golden hour (~1 hr before) — warm, low side-light that rakes across the scene; face WEST.",
      "• Sun disk (at sunset) — the sun on the horizon; wants a clean, open WESTERN view.",
      "• Belt of Venus (0–20 min after) — the pink band above the Earth's shadow, OPPOSITE the sun; look EAST.",
      "• Civil twilight (~20 min after) — the sky's peak afterglow colour, overhead and all around.",
      "• Blue hour (30–50 min after) — deep-blue calm; best for city lights and water reflections.",
    ].join("\n"),
  },
  {
    topic: "The Belt of Venus",
    keywords: ["belt of venus", "belt", "venus", "earth shadow", "earth's shadow", "anti-solar", "pink band"],
    body: "The Belt of Venus is the rosy-pink anti-twilight arch that appears OPPOSITE the setting sun — in the EASTERN sky at sunset — sitting above the rising dark-blue band of the Earth's shadow. To catch it you want a clear EASTERN horizon (not west). It's most vivid ~0–20 minutes after sunset in clean, still air.",
  },
  {
    topic: "What makes a good sunset",
    keywords: ["good sunset", "great sunset", "quality", "clouds", "conditions", "amazing", "vivid", "colour", "color"],
    body: [
      "Vivid sunsets need the right ingredients:",
      "• Clouds: HIGH and MID clouds (cirrus, altocumulus) catch and scatter colour — great. LOW overcast blocks the light — bad.",
      "• Clean, dry air: high visibility and moderate aerosols intensify reds; fog/haze/high humidity mute them.",
      "• Stable high pressure: settled anticyclonic air holds the sky clear and the colours crisp.",
      "• Little/no rain: a high precipitation chance drives the odds toward a washed-out sky.",
      "Nightfalls scores each evening 0–100 on these factors (cloud quality weighted most).",
    ].join("\n"),
  },
  {
    topic: "How Nightfalls recommends a spot",
    keywords: ["recommend", "spot", "location", "how", "score", "terrain", "ranking", "best place"],
    body: [
      "A great *view* is more than a good sky — it's the right place. Nightfalls ranks spots by:",
      "• Directional horizon clarity (terrain): can you actually see the phase? Belt of Venus wants a clear EAST horizon; the sun/golden hour want a clear WEST.",
      "• Backdrop & variety: distant relief, water reflections, and scene variety that make a composition, not just an empty horizon.",
      "• Popularity: well-reviewed viewpoints (via Google) are boosted and tagged 'Popular'.",
      "It combines a nearby-spot search with tonight's sky forecast to answer 'where can I catch an amazing sunset tonight?'",
    ].join("\n"),
  },
];

/** Render the guide, optionally focused on a topic keyword. */
export function renderSunsetGuide(topic?: string): string {
  if (topic) {
    const query = topic.toLowerCase();
    const match = KNOWLEDGE.find((entry) =>
      entry.keywords.some((keyword) => query.includes(keyword)),
    );
    if (match) {
      return `${match.topic}\n\n${match.body}`;
    }
  }
  return KNOWLEDGE.map((entry) => `${entry.topic}\n${entry.body}`).join("\n\n");
}
