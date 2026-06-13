# Sunset Location Discovery Evaluation

## Prototype

The prototype is implemented in `src/lib/locationDiscovery`. It compares these discovery options:

- `osm-overpass`: low-cost structured place discovery from map tags.
- `google-places`: paid metadata and photo enrichment.
- `open-photo`: Wikimedia/Flickr-style image enrichment with attribution.
- `web-validation`: manual or agent-assisted golden checks against public pages.

The first fixture set targets Vancouver and Surrey, BC because they provide a useful local test: beaches, elevated parks, lighthouse viewpoints, and waterfront parks.

The deployable backend slice now includes:

- `GET /api/locations/sunset-spots?lat=49.2827&lon=-123.1207`
- Live OSM/Overpass discovery for nearby viewpoints, beaches, parks, piers, lighthouses, peaks, cliffs, and observation towers.
- Progressive search passes: high-confidence scenic tags first, then broader scenic/water/trail/name signals.
- Ranking by scenic signal, west/water/elevation signal, access, and validation references.
- Validated Vancouver/Surrey references merged into matching live candidates.
- Fallback to nearby validated candidates if the live Overpass request fails or returns sparse data.
- Search diagnostics in the API response so the UI/debugger can show which passes ran and how many candidates came from live OSM versus validated seeds.

Optional query parameters:

- `radiusMeters`: defaults to `20000`, capped at `35000`.
- `limit`: defaults to `12`, capped at `25`.

Important UX rule: automatically discovered OSM pins are promising suggestions, not claims. A pin should only show reference links or pictures when `confirmedByGoldenSource` is true or when a later enrichment source attaches licensed imagery.

The end-to-end feature now adds a map-side "Sunset spots" layer:

- The map automatically fetches nearby spot suggestions for the current map center.
- Suggested pins are visually separate from the user's prediction markers.
- Each suggestion shows whether it is validated or still scout-worthy.
- Each suggestion includes a `viewQualityScore` and qualification badges that explain why the spot may work.
- Validated suggestions can show source references and, when available from an open reference, a preview image.
- Users can add a suggested spot to their prediction markers, then run the existing sunset forecast flow.
- The feature preserves the current five-marker prediction limit.

## Forgiveness Update

The first implementation was too brittle in places like Coquitlam and central Surrey because many useful sunset places are tagged as ordinary parks, waterfront trails, lakes, rivers, or named shore/path features rather than formal `tourism=viewpoint` records.

The search is now intentionally more forgiving:

1. `high-confidence`: nearby viewpoints, beaches, piers, lighthouses, peaks, cliffs, and observation towers.
2. `broad-scenic`: parks, nature reserves, marinas, lakes, rivers, named trails, and places whose names include terms like View, Lookout, Point, Shore, Dyke, Beach, Pier, Lake, Inlet, River, Mountain, Ridge, Marine, or Waterfront.
3. `regional-fallback`: validated local seeds within the effective radius.

Additional fallback seeds now include:

- Surrey: Mud Bay Park, Brownsville Bar Park, Serpentine Fen.
- Coquitlam/Tri-Cities: Rocky Point Park, Old Orchard Park, Belcarra Regional Park, Burnaby Mountain.

The product decision is to prefer a slightly broader list of scout-worthy candidates over an empty panel. The UI still distinguishes validated locations from automatically discovered suggestions.

## View Quality Criteria

The ranking now separates "is this place scenic?" from "is this place photographically useful for sunset?" Each candidate includes:

- `viewQualityScore`: weighted from elevation signal, water/open-horizon signal, foreground interest, and western exposure.
- `qualificationBadges`: short explanations such as High vantage, Western exposure, Wide horizon, Water reflection, Foreground interest, Seasonal scout, and Validated reference.

This keeps the feature explainable. A user can see whether a pin is suggested because it is elevated, faces west, has water reflection potential, has an open horizon, or has a validated public reference.

## Golden Check Results

The prototype candidates line up with public references:

- Sunset Beach: City of Vancouver confirms a beach at the mouth of False Creek, on the seawall, with public facilities and dusk imagery.
- Queen Elizabeth Park: City of Vancouver confirms it is the highest point in Vancouver, with spectacular park, city, and North Shore views.
- Lighthouse Park: District of West Vancouver confirms a lighthouse viewpoint, a photographed landmark, walking/hiking access, and public park hours.
- English Bay Beach: public references describe the English Bay beaches as sunset-watching beaches.
- Blackie Spit Park: City of Surrey confirms a stunning beach, Mud Bay setting, and amazing views of Mud Bay and the North Shore Mountains.
- Crescent Beach: public references confirm a beachside South Surrey community beside Boundary Bay and Mud Bay.

## Efficiency Read

Expected live-source efficiency:

| Source | Coverage | Precision | Cost | Caching | Best Use |
| --- | --- | --- | --- | --- | --- |
| OSM/Overpass | Medium-high | Medium | Low | Strong | First-pass candidate generation |
| Google Places | High | Medium-high | Medium-high | Limited for photos | Place details and image preview |
| Wikimedia/Flickr | Medium | Medium | Low-medium | Strong when licensed | Durable reference images |
| Web search validation | Low live scalability | High for known spots | High latency | Weak | Golden checks and QA |

## Prototype Ranking Output

The first scoring pass produced these ranked candidates.

### Vancouver, BC

| Rank | Candidate | Score | Why it scored |
| --- | --- | ---: | --- |
| 1 | Lighthouse Park | 71 | Confirmed lighthouse viewpoint, west-facing water, elevation, strong official reference, photo potential |
| 2 | Queen Elizabeth Park | 58 | Highest point in Vancouver, panoramic views, strong official reference |
| 3 | Sunset Beach | 55 | West-facing public beach, seawall access, strong official reference |
| 4 | English Bay Beach | 53 | Public sunset-watching beach, west-facing water, medium public reference |

### Surrey, BC

| Rank | Candidate | Score | Why it scored |
| --- | --- | ---: | --- |
| 1 | Blackie Spit Park | 55 | Stunning public beach, Mud Bay and North Shore views, strong City of Surrey reference |
| 2 | Crescent Beach | 53 | Beachside waterfront location beside Boundary Bay and Mud Bay, medium public reference |

### Source Efficiency From Fixtures

| Region | Source | Candidates | Confirmed | Estimated Requests | API Key | Image Caching |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Vancouver | OSM/Overpass | 4 | 4 | 5 | No | No |
| Vancouver | Google Places | 4 | 4 | 13 | Yes | No |
| Vancouver | Open photo | 1 | 1 | 3 | Yes | Yes, when licensed |
| Vancouver | Web validation | 4 | 4 | 25 | No | No |
| Surrey | OSM/Overpass | 2 | 2 | 3 | No | No |
| Surrey | Google Places | 2 | 2 | 7 | Yes | No |
| Surrey | Open photo | 2 | 2 | 5 | Yes | Yes, when licensed |
| Surrey | Web validation | 2 | 2 | 13 | No | No |

Takeaway: OSM/Overpass is the best live candidate generator. Google Places is useful only after ranking because it has higher request cost and photo caching restrictions. Web validation is excellent for golden checks but too slow and noisy for production discovery.

## Initial Product Recommendation

Use OSM/Overpass as the default discovery layer, then enrich only the top ranked pins:

1. Query nearby OSM candidates by viewport.
2. Rank candidates by scenic tag, westward/water view signal, access, and references.
3. Run the existing sunset prediction on the top candidates only.
4. Fetch Google Places photos only for the highest-scoring pins.
5. Prefer open-photo references when a durable, attributed image is available.

For Vancouver and Surrey, this should successfully surface beaches and known viewpoints without scraping Google Images or crawling arbitrary pages.

## Sources Checked

- https://vancouver.ca/parks-recreation-culture/sunset-beach.aspx
- https://vancouver.ca/parks-recreation-culture/queen-elizabeth-park.aspx
- https://westvancouver.ca/parks-recreation/parks-trails/lighthouse-park
- https://www.surrey.ca/parks-recreation/parks/blackie-spit-park
- https://en.wikipedia.org/wiki/English_Bay,_Vancouver
- https://en.wikipedia.org/wiki/Crescent_Beach,_Surrey
