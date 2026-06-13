# Multi-Phase Sunset Recommendation Model

## Goal

The current recommendation system finds plausible sunset spots and explains why they may work. The next step is to treat sunset as a sequence of photographic phases rather than one event. Each phase has different light, different best subjects, different viewing direction, and different location criteria.

This model lets Nightfalls recommend not only where to go, but what kind of sunset experience a location is best for.

## Core Idea

A sunset outing should be scored as a timeline:

```text
pre-sunset golden hour
sunset disk / horizon moment
afterglow and Belt of Venus
civil twilight
blue hour
nautical twilight / night transition
```

Each candidate location can receive phase-specific scores:

```ts
{
  locationScore: 78,
  phases: [
    {
      phase: "golden-hour",
      score: 82,
      start: "2026-06-11T03:14:00.000Z",
      end: "2026-06-11T04:06:00.000Z",
      bestViewingDirection: "toward-sun",
      bestFor: ["portraits", "warm landscape", "long shadows"],
      requirements: ["western exposure", "foreground interest"]
    }
  ]
}
```

## Phase Breakdown

### 1. Golden Hour

Golden hour is the warm, low-angle light before sunset. It is best for portraits, foreground texture, warm city scenes, beaches, and side-lit landscapes.

Approximate timing:

- Starts when the sun is low above the horizon.
- Ends at sunset.
- Already available through SunCalc as `goldenHour` to `sunset`.

Best viewing direction:

- Toward the sun for silhouettes, water sparkle, sun disk, and warm sky.
- Side-on to the sun for dimensional landscape and portrait lighting.

Location criteria:

- Western or southwest/northwest exposure depending on season.
- Interesting foreground: pier, trees, boats, bridge, skyline, beach, mountain ridge.
- Open enough horizon to catch low sun.
- Places with water get a reflection boost.

Recommendation badges:

- Golden light
- Long shadows
- Warm foreground
- Water sparkle
- Silhouette potential

### 2. Sunset Disk / Horizon Moment

This is the brief moment when the sun touches or drops below the visible horizon. It is different from overall sunset color quality.

Approximate timing:

- Around the astronomical sunset time.
- The practical moment depends on local terrain, trees, buildings, and mountains.

Best viewing direction:

- Directly toward the sunset azimuth.

Location criteria:

- Very low obstruction in the sunset direction.
- West-facing water, bay, beach, dyke, pier, high viewpoint, or ridge.
- Elevation helps if local buildings/trees block the horizon.
- Mountain horizons are beautiful but may hide the disk earlier.

Recommendation badges:

- Horizon view
- Sun disk
- Low obstruction
- Silhouette potential

### 3. Afterglow and Belt of Venus

The purple/pink band opposite the sunset is commonly called the Belt of Venus, also known as the antitwilight arch. It appears during twilight opposite the sun, above the darker band of Earth's shadow.

Approximate timing:

- Shortly after sunset, during early twilight.
- Often best when the horizon opposite the sunset is open.

Best viewing direction:

- Opposite the sun, toward the antisolar direction.
- If sunset azimuth is west-northwest, Belt of Venus viewing is east-southeast.

Location criteria:

- Open eastern horizon or panoramic viewpoint.
- Elevated viewpoints, beaches, lakes, bays, fields, or dyke trails.
- Clear air and some particulate/haze can help color, but smoke/poor visibility can hurt clarity.

Recommendation badges:

- Belt of Venus
- Antisolar view
- Pink horizon
- Wide horizon
- High vantage

### 4. Civil Twilight

Civil twilight begins after sunset and lasts until the sun is about 6 degrees below the horizon. There is still enough natural light for many outdoor scenes.

Approximate timing:

- Sunset to civil dusk.

Best viewing direction:

- Toward the brighter afterglow for sky color.
- Opposite the sun for Belt of Venus if conditions allow.
- Toward city/landmark foregrounds as artificial lights begin to balance with the sky.

Location criteria:

- City skyline, bridges, waterfront, marinas, lit paths, recognizable foreground.
- Good for handheld or light tripod use.
- Safer public access matters more because light is fading.

Recommendation badges:

- Easy twilight
- City lights
- Bridge lights
- Waterfront glow

### 5. Blue Hour

Blue hour is the twilight period after sunset when indirect sunlight gives the sky a deep blue tone. It is especially useful for cityscapes, reflections, bridges, skyline shots, and long exposures.

Approximate timing:

- Usually after sunset, often around civil to nautical twilight.
- A practical approximation is when the sun is between about 4 and 8 degrees below the horizon.
- Exact duration varies by latitude, season, weather, and air clarity.

Best viewing direction:

- Often away from the brightest afterglow, toward city lights, water, skyline, or mountain silhouettes.
- Reflections matter more than direct sun direction.

Location criteria:

- Tripod-friendly public space.
- Water, skyline, bridge, marina, streetlights, or illuminated architecture.
- Less dependent on west-facing horizon.
- More dependent on safety, access, and foreground lights.

Recommendation badges:

- Blue hour
- Long exposure
- City lights
- Reflection shot
- Tripod friendly

### 6. Nautical Twilight / Night Transition

This phase is darker and more specialized. The sky is dimmer, and the horizon becomes harder to distinguish. It is useful for city night transitions, moon, stars, or long-exposure water.

Approximate timing:

- After civil twilight, when the sun is roughly 6 to 12 degrees below the horizon.

Best viewing direction:

- City lights, skyline, bridge, moon direction, or open water.

Location criteria:

- Safety and public access become primary.
- Stable tripod location.
- Low light pollution for sky-oriented shots.

Recommendation badges:

- Night transition
- City nightscape
- Long exposure
- Low-light scout

## Viewing Direction Model

Each phase should calculate one or more useful viewing bearings:

```text
sunset azimuth = direction of the sun at sunset
antisolar azimuth = sunset azimuth + 180 degrees
side-light bearings = sunset azimuth +/- 90 degrees
```

Phase mapping:

- Golden hour: sunset azimuth or side-light bearings.
- Sunset disk: sunset azimuth.
- Belt of Venus: antisolar azimuth.
- Civil twilight: sunset azimuth, antisolar azimuth, or city/foreground direction.
- Blue hour: foreground/light/reflection direction, less sun-dependent.

## Location Scoring Extensions

The current spot score can become a parent score made from phase scores:

```text
location_score =
  max(phase_scores) * 0.45
  + average(top_3_phase_scores) * 0.35
  + access_safety_score * 0.10
  + forecast_confidence * 0.10
```

Each phase gets its own criteria:

```text
golden_hour_score =
  western_exposure
  + side_light_foreground
  + water_reflection
  + weather_golden_score

sun_disk_score =
  sunset_azimuth_alignment
  + horizon_openness
  + elevation_prominence
  - obstruction_risk

belt_of_venus_score =
  antisolar_horizon_openness
  + elevation_prominence
  + visibility
  + atmospheric_color_potential

blue_hour_score =
  foreground_lights
  + water_reflection
  + tripod_access
  + public_safety
  + low_precipitation
```

## Recommendation Types

Instead of a generic list of "sunset spots", the UI can recommend based on intent:

- Best overall tonight
- Golden hour portraits
- Sun disk / silhouettes
- Pink horizon / Belt of Venus
- Blue hour cityscape
- Water reflections
- Elevated viewpoint
- Low-effort nearby
- Scout-worthy

The same physical spot can be recommended for different reasons on different nights.

Example:

```ts
{
  name: "Rocky Point Park",
  recommendedFor: ["golden-hour", "blue-hour", "water-reflection"],
  bestPhase: "blue-hour",
  phaseScores: {
    goldenHour: 72,
    sunDisk: 58,
    beltOfVenus: 62,
    blueHour: 84
  }
}
```

## Weather Model Extensions

The existing weather score should split into phase-specific weather scores:

- Golden hour benefits from warm low-angle light, partial cloud texture, and low rain.
- Sun disk requires low horizon obstruction, low low-cloud cover, and low precipitation.
- Belt of Venus benefits from clear opposite horizon, visibility, and atmospheric clarity.
- Blue hour benefits from low precipitation, decent visibility, and city/foreground light availability.

Useful weather fields already present or easy to add:

- cloud cover low/mid/high
- visibility
- humidity
- precipitation probability
- aerosol optical depth
- PM2.5 / PM10
- wind

## Data We Need Next

### Already Available

- Sunset time.
- Golden hour timing from SunCalc.
- Forecast weather and sunset quality score.
- OSM tags for parks, water, elevation-ish features, paths, viewpoints.
- Local curated fallback seeds.

### Useful Next Additions

- Sunset azimuth and solar elevation by phase.
- Blue hour and twilight phase times.
- Elevation API or DEM sampling.
- Relative elevation/prominence around candidate.
- Basic horizon obstruction estimate.
- Safer access metadata: park hours, trail type, lighting, transit/parking.
- User feedback: "good view", "blocked", "unsafe", "great reflection".

## Implementation Plan

### Phase 1: No New Paid APIs

Use SunCalc and existing OSM metadata.

1. Add phase windows to each spot:
   - golden hour
   - sunset
   - civil twilight
   - blue hour approximation
2. Add phase tags:
   - Golden hour
   - Sun disk
   - Belt of Venus
   - Blue hour
   - Water reflection
   - City lights
3. Add viewing direction fields:
   - sunset azimuth
   - antisolar azimuth
   - side-light azimuths
4. Add `recommendedFor` and `bestPhase` to the API.
5. Add filter chips for phase type in the map panel.

### Phase 2: Better Topography

Add elevation-derived scoring:

1. Fetch candidate elevation.
2. Sample surrounding points at 250m, 500m, and 1km.
3. Compute relative elevation.
4. Boost high relative elevation and horizon potential.

### Phase 3: User Feedback Loop

Let users mark:

- Great spot
- View blocked
- Good reflection
- Good blue hour
- Unsafe / access issue
- Private / restricted

Then use aggregate feedback as a local confidence score.

## Product Decision

The next implementation should not try to predict one perfect sunset score. It should produce a phase-aware recommendation:

```text
"Go here for blue hour reflections."
"Go here for the sun disk."
"Go here for the pink Belt of Venus after sunset."
"Go here if you want easy golden-hour portraits."
```

This is more useful than a single score because users have different intents, and the same atmospheric conditions can be poor for one phase but excellent for another.

