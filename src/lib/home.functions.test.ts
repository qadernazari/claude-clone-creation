import { describe, it, expect } from "vitest";
import { buildSignedUrlCacheKey } from "./home.functions";

describe("buildSignedUrlCacheKey", () => {
  const base = ["films", "abc/poster.jpg", 1280, 720, "cover", 68] as const;
  const key = (...args: Parameters<typeof buildSignedUrlCacheKey>) =>
    buildSignedUrlCacheKey(...args);

  it("is deterministic for identical inputs", () => {
    expect(key(...base)).toBe(key(...base));
  });

  it("differs when bucket changes", () => {
    expect(key("films", "p", 100, 100, "cover", 68)).not.toBe(
      key("other", "p", 100, 100, "cover", 68),
    );
  });

  it("differs when path changes", () => {
    expect(key("films", "a.jpg", 100, 100, "cover", 68)).not.toBe(
      key("films", "b.jpg", 100, 100, "cover", 68),
    );
  });

  it("differs when width changes", () => {
    expect(key("films", "p", 100, 100, "cover", 68)).not.toBe(
      key("films", "p", 200, 100, "cover", 68),
    );
  });

  it("differs when height changes", () => {
    expect(key("films", "p", 100, 100, "cover", 68)).not.toBe(
      key("films", "p", 100, 200, "cover", 68),
    );
  });

  it("differs when resize mode changes", () => {
    expect(key("films", "p", 100, 100, "cover", 68)).not.toBe(
      key("films", "p", 100, 100, "contain", 68),
    );
    expect(key("films", "p", 100, 100, "cover", 68)).not.toBe(
      key("films", "p", 100, 100, "fill", 68),
    );
  });

  it("differs when quality changes", () => {
    expect(key("films", "p", 100, 100, "cover", 68)).not.toBe(
      key("films", "p", 100, 100, "cover", 90),
    );
  });

  it("treats undefined height as distinct from explicit 0-height inputs semantically but stably", () => {
    // undefined normalizes to 0 (matches production logic); documented behavior.
    expect(key("films", "p", 100, undefined, "cover", 68)).toBe(
      key("films", "p", 100, 0, "cover", 68),
    );
  });

  it("has no collisions across a matrix of varied parameter combinations", () => {
    const buckets = ["films", "covers"];
    const paths = ["a/b.jpg", "a/c.jpg", "x.png"];
    const widths = [320, 640, 1280, 1920];
    const heights: (number | undefined)[] = [undefined, 180, 720, 1080];
    const resizes: Array<"contain" | "cover" | "fill"> = ["contain", "cover", "fill"];
    const qualities = [50, 68, 80, 95];

    const seen = new Map<string, string>();
    for (const b of buckets)
      for (const p of paths)
        for (const w of widths)
          for (const h of heights)
            for (const r of resizes)
              for (const q of qualities) {
                const k = key(b, p, w, h, r, q);
                const sig = JSON.stringify([b, p, w, h ?? 0, r, q]);
                const prev = seen.get(k);
                if (prev && prev !== sig) {
                  throw new Error(`Collision for key ${k}: ${prev} vs ${sig}`);
                }
                seen.set(k, sig);
              }
    // Expected count: 2*3*4*4*3*4 = 1152
    expect(seen.size).toBe(1152);
  });

  it("is not fooled by parameter values that look like the delimiter concatenation", () => {
    // If someone naively concatenated without a delimiter, these would collide.
    const a = key("films", "p", 12, 80, "cover", 68);
    const b = key("films", "p", 1, 280, "cover", 68);
    expect(a).not.toBe(b);
  });
});
