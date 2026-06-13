# Sunset Location Discovery Analysis

## Context

As part of the scope-down work, Nightfalls should evaluate a feature that helps users find nearby places where a beautiful sunset could be captured on camera. This extends the app beyond predicting sunset quality at a chosen point. The product would recommend promising pins around the user's vicinity, ideally with references or pictures for each location, so users can choose where to go for photography, memory-making, or casual viewing.

The key product distinction:

- Current experience: "Will sunset be good where I am looking?"
- Proposed experience: "Where near me should I go if sunset will be good tonight?"

## Feasibility Summary

This is feasible, but it should not start as broad web scraping or image scraping. The most practical version is a ranked-location recommender built from structured map data, then enriched with photos where licensing and API terms allow.

Recommended MVP:

1. Find nearby candidate places using OpenStreetMap viewpoint and landmark data.
2. Score each candidate using the existing sunset prediction engine.
3. Filter for western visibility and reasonable access where data exists.
4. Enrich pins with Google Places photos or Wikimedia/Flickr images when available.
5. Cache candidates and photo metadata by geohash to control cost.

Avoid as an MVP:

- Generic web scraping.
- Google Images scraping.
- Social-media scraping.
- Storing third-party photos without clear caching rights.

## Candidate Data Sources

### OpenStreetMap and Overpass

OpenStreetMap is the best free base layer for location discovery. The `tourism=viewpoint` tag identifies places worth visiting for a view, often suitable for photography. It can also include direction metadata such as `direction=W`, which is especially useful for sunset recommendations.

Useful tags:

- `tourism=viewpoint`
- `viewpoint=*`
- `direction=*`
- `natural=peak`
- `man_made=tower`
- `tower:type=observation`
- `leisure=park`
- `natural=beach`
- `waterway=*`
- `natural=cliff`
- `bridge=yes`
- `historic=*`

Pros:

- Free and broad coverage.
- Good fit for scenic viewpoints and public places.
- Queryable by bounding box through Overpass.
- Can be cached aggressively.

Cons:

- Data completeness varies by region.
- Photos are not usually included.
- "Good for sunset" is inferred, not guaranteed.

Sources:

- https://wiki.openstreetmap.org/wiki/Tag:tourism%3Dviewpoint
- https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL

### Google Places and Place Photos

Google Places is useful for established parks, beaches, lookouts, landmarks, piers, waterfronts, and attractions. Place Photos can provide high-quality user-contributed images, but the API has usage cost and caching restrictions. Google photo names can expire and should be fetched from Places responses rather than stored as durable assets.

Pros:

- High-quality place metadata.
- Rich user-contributed photos.
- Already aligned with the app's Google Maps dependency.

Cons:

- Paid API usage.
- Photo caching restrictions.
- Attributions must be displayed when returned.
- Not all place photos show sunsets.

Source:

- https://developers.google.com/maps/documentation/places/web-service/place-photos

### Wikimedia Commons and Wikidata

Wikimedia can provide openly licensed images and structured links for landmarks, parks, beaches, mountains, and scenic viewpoints. This is a strong source for reference images when the place is notable.

Pros:

- Open licensing when attribution is handled correctly.
- Good for notable landmarks and travel destinations.
- Can support durable references better than Google photos.

Cons:

- Coverage is uneven.
- Images may not depict sunset conditions.
- Requires attribution and license handling.

Sources:

- https://www.mediawiki.org/wiki/API:Geosearch
- https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/queries/examples

### Flickr

Flickr has API support for searching photos, including geotagged photos. It may be useful for sunset-tagged imagery around candidate locations.

Pros:

- Good historical photography source.
- Can search by tags such as `sunset`, coordinates, and radius.
- Some photos have reusable Creative Commons licenses.

Cons:

- Quality and freshness vary.
- Requires careful license filtering.
- User-generated tags are noisy.

Source:

- https://www.flickr.com/services/api/flickr.photos.search.html

### Mapillary

Mapillary provides crowdsourced street-level imagery. It is better for checking access, street view context, and approach safety than for finding beautiful sunset photos.

Pros:

- Useful for visual context near roads and trails.
- Geotagged imagery.
- Can help answer "can I actually get here?"

Cons:

- Not optimized for scenic sunset photography.
- Imagery is often street-level and utilitarian.
- API/product constraints should be reviewed before integration.

Source:

- https://www.mapillary.com/developer/api-documentation

### OpenTripMap and Similar Travel APIs

Travel POI APIs can identify tourist attractions, viewpoints, beaches, natural landmarks, and photo-worthy places. They may be useful as a secondary enrichment source if their free tier fits the project.

Pros:

- Higher-level tourist categories than raw OSM.
- May include summaries, kinds, ratings, or Wikimedia links.

Cons:

- API limits and licensing need review.
- May duplicate OSM/Wikidata data.

Source:

- https://opentripmap.io/docs

## Why Generic Web Scraping Is Not Recommended

Generic scraping sounds attractive but is a poor first implementation:

- Search result pages and image search pages often prohibit scraping.
- HTML changes create brittle maintenance.
- Image rights are unclear.
- Geotag extraction is unreliable.
- Cost and latency are hard to control.
- The product needs trustworthy pins, not a large pile of noisy images.

If the app later needs broader discovery, use a controlled ingestion pipeline with whitelisted sources, license filters, attribution, and human review.

## Proposed Ranking Model

Each candidate pin should get a composite score:

```text
final_location_score =
  sunset_prediction_score * 0.45
  + scenic_confidence * 0.20
  + westward_view_confidence * 0.15
  + accessibility_score * 0.10
  + photo_reference_score * 0.10
```

Candidate fields:

- `name`
- `latitude`
- `longitude`
- `source`
- `source_id`
- `candidate_type`
- `distance_meters`
- `sunset_score`
- `scenic_confidence`
- `westward_view_confidence`
- `accessibility_score`
- `photo_reference_score`
- `reference_images`
- `attribution`

Initial scoring heuristics:

- Prefer `tourism=viewpoint`, beaches, waterfront parks, piers, peaks, bridges, and observation towers.
- Prefer OSM `direction` values that include west, southwest, or northwest.
- Penalize locations without pedestrian/public access signals.
- Penalize locations too far from the user for a same-day suggestion.
- Boost candidates with a licensed image or Google Place photo reference.
- Use the existing weather/sunset quality score for each candidate location.

## Map Product Experience

The map should show a "Sunset spots near you" layer:

- Pin color: tonight's sunset quality score.
- Pin shape or icon: viewpoint, beach, park, landmark, waterfront, city view.
- Small photo preview when available.
- Source attribution in the detail sheet.
- Distance from user.
- Sunset time and golden hour arrival suggestion.
- "Save this spot" action.
- "Notify me when this spot looks good" action.

For low confidence pins, show the recommendation as exploratory rather than authoritative.

## Supabase Fit

This feature pairs well with the notification system proposal. Supabase can store candidate places, enriched references, user saves, feedback, and cached forecasts.

Suggested tables:

```sql
sunset_location_candidates
- id uuid primary key
- source text not null
- source_id text not null
- name text
- latitude numeric not null
- longitude numeric not null
- geohash text not null
- candidate_type text not null
- scenic_confidence int not null
- westward_view_confidence int not null
- accessibility_score int not null
- raw_source jsonb
- created_at timestamptz not null
- updated_at timestamptz not null

sunset_location_references
- id uuid primary key
- candidate_id uuid not null
- source text not null
- image_url text
- page_url text
- thumbnail_url text
- license text
- attribution text
- width int
- height int
- created_at timestamptz not null

user_saved_locations
- id uuid primary key
- user_id uuid not null
- candidate_id uuid
- name text
- latitude numeric not null
- longitude numeric not null
- created_at timestamptz not null

location_discovery_feedback
- id uuid primary key
- user_id uuid not null
- candidate_id uuid not null
- rating int
- feedback text
- created_at timestamptz not null
```

RLS should restrict user-owned saved locations and feedback by `auth.uid()`. Shared candidate and reference tables can be readable by authenticated users or served through an API route. New Supabase projects may require explicit grants for public-schema tables before the Data API can access them.

## Cost Controls

- Cache OSM/Overpass candidate searches by geohash and radius.
- Cache prediction results by rounded coordinate and date.
- Fetch photo references only for the top ranked candidates.
- Prefer open image sources before paid photo APIs.
- Store image metadata, not third-party image binaries, unless license and terms allow storage.
- Cap visible suggestions per viewport, for example 10 to 25.
- Refresh candidate discovery weekly or on-demand, not every page load.
- Refresh forecast scores daily or a few times per day.

## MVP Recommendation

Start with a structured, low-cost MVP:

1. Query OSM/Overpass for scenic candidate types near the user's map viewport.
2. Rank candidates with simple scenic/access heuristics.
3. Run existing sunset prediction for the top candidates only.
4. Display the top 5 to 10 pins on the map.
5. Use Google Places photos only when the candidate can be matched to a Place ID and the app budget allows it.
6. Add Wikimedia/Flickr enrichment as a second pass for open imagery.
7. Let users save recommended spots and attach notification rules later.

This gives the user practical guidance without taking on the legal and operational burden of broad scraping.

## Open Questions

- Should recommendations optimize for photography quality, casual viewing, or accessibility first?
- What is the acceptable travel radius for "near me" on mobile?
- Should the feature include sunrise later, or stay sunset-only?
- Do we want user-submitted photos and tips in the first version?
- Should SMS notifications be tied to saved spots only, not discovery pins?

