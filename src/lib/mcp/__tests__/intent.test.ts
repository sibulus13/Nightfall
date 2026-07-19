import { describe, expect, it } from "vitest";
import { extractLocation, routeFallbackIntent } from "~/lib/mcp/intent";

describe("extractLocation", () => {
  it("pulls a place after in/near/at/around/for", () => {
    expect(extractLocation("sunset spots in Seattle")).toBe("Seattle");
    expect(extractLocation("best sunset near Vancouver")).toBe("Vancouver");
    expect(extractLocation("what's around Santa Monica")).toBe("Santa Monica");
  });

  it("trims trailing time words", () => {
    expect(extractLocation("a sunset in Seattle tonight")).toBe("Seattle");
    expect(extractLocation("forecast for Portland this week")).toBe("Portland");
  });

  it("returns null when no place is present", () => {
    expect(extractLocation("where can I catch a sunset?")).toBeNull();
    expect(extractLocation("what is the belt of venus")).toBeNull();
  });
});

describe("routeFallbackIntent", () => {
  it("routes concept questions to the guide (no location needed)", () => {
    expect(routeFallbackIntent("what is the Belt of Venus?")).toEqual({
      kind: "guide",
      topic: "what is the Belt of Venus?",
    });
    expect(routeFallbackIntent("explain golden hour").kind).toBe("guide");
    expect(routeFallbackIntent("what makes a good sunset").kind).toBe("guide");
  });

  it("routes multi-day questions to the forecast", () => {
    expect(routeFallbackIntent("best sunset this week in Vancouver")).toEqual({
      kind: "forecast",
      location: "Vancouver",
    });
    expect(routeFallbackIntent("forecast for Portland").kind).toBe("forecast");
  });

  it("routes tonight/where questions to spots", () => {
    expect(
      routeFallbackIntent("where can I catch a sunset tonight in Seattle"),
    ).toEqual({ kind: "spots", location: "Seattle" });
  });

  it("asks for a location when a place is needed but missing", () => {
    expect(routeFallbackIntent("where can I catch a sunset tonight")).toEqual({
      kind: "need_location",
    });
  });

  it("prioritizes guide intent even when a location is present", () => {
    // A concept question mentioning a place is still a guide question.
    expect(routeFallbackIntent("explain the phases in Seattle").kind).toBe(
      "guide",
    );
  });
});
