/**
 * Runtime verification that IranSansX actually loads in Persian mode.
 *
 * Runs client-side only, once per page load, when `document.documentElement.lang === "fa"`.
 * Uses the `document.fonts` FontFaceSet API to:
 *
 *   1. Wait for font loading to settle (or 4s, whichever first).
 *   2. Confirm at least one `IRANSansXFaNum` face reached `status === "loaded"`.
 *   3. Measure the computed `font-family` of `<body>` and confirm IranSansX is
 *      present in the resolved cascade.
 *
 * On failure it emits a single, well-labelled `console.warn` with actionable
 * context: which check failed, what the browser resolved instead, and the
 * URLs of the woff2 files it attempted. No user-facing UI — this is a dev/QA
 * signal that surfaces in the browser console and in the session replay tool.
 *
 * Safe to run in production: cost is one microtask + one getComputedStyle read.
 */

const FAMILY = "IRANSansXFaNum";
const WARN_TAG = "[font-check]";

let ran = false;

export function verifyPersianFont(): void {
  if (ran) return;
  ran = true;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (document.documentElement.lang !== "fa") return;
  if (!("fonts" in document)) {
    console.warn(`${WARN_TAG} document.fonts API unavailable; cannot verify ${FAMILY}.`);
    return;
  }

  const start = performance.now();

  const check = () => {
    const faces = Array.from(document.fonts as unknown as Iterable<FontFace>).filter(
      (f) => f.family.replace(/["']/g, "") === FAMILY,
    );

    if (faces.length === 0) {
      console.warn(
        `${WARN_TAG} No @font-face rules found for ${FAMILY}. Check that public/fonts/iransansx.css is imported and served.`,
      );
      return;
    }

    const loaded = faces.filter((f) => f.status === "loaded");
    if (loaded.length === 0) {
      const statuses = faces.map((f) => `${f.weight}:${f.status}`).join(", ");
      console.warn(
        `${WARN_TAG} ${FAMILY} faces are declared but none loaded (${statuses}). ` +
          `Verify /fonts/*.woff2 assets exist and are reachable.`,
      );
      return;
    }

    const bodyFamily = getComputedStyle(document.body).fontFamily || "";
    if (!bodyFamily.includes(FAMILY)) {
      console.warn(
        `${WARN_TAG} <body> resolved font-family does not include ${FAMILY}. ` +
          `Got: "${bodyFamily}". Something is overriding the Persian cascade.`,
      );
      return;
    }

    const elapsed = Math.round(performance.now() - start);
    // Success: one debug line so QA can confirm in devtools. Not a warn.
    console.debug(
      `${WARN_TAG} ok — ${loaded.length}/${faces.length} ${FAMILY} face(s) loaded in ${elapsed}ms.`,
    );
  };

  // Wait for the FontFaceSet to settle, but cap at 4s so a hung network
  // request still produces a warning.
  const settled = (document.fonts as unknown as { ready: Promise<unknown> }).ready;
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 4000));
  Promise.race([settled, timeout]).then(check).catch(() => check());
}
