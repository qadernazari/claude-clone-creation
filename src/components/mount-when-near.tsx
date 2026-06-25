import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders children only after:
 *   1. The user has scrolled (or interacted), AND
 *   2. The placeholder is near the viewport.
 *
 * Keeps below-the-fold rails, reviews, episodes, and other non-essential
 * sections out of the initial paint + hydration critical path. Cuts JS,
 * queries, and image requests until the user shows intent.
 */
export function MountWhenNear({
  children,
  rootMargin = "200px",
  minHeight,
}: {
  children: ReactNode;
  rootMargin?: string;
  minHeight?: number | string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);
  const [armed, setArmed] = useState(false);

  // Arm on first scroll / pointer / keyboard / touch — any user intent.
  useEffect(() => {
    if (armed) return;
    const arm = () => setArmed(true);
    if (window.scrollY > 20) {
      setArmed(true);
      return;
    }
    const opts = { passive: true, once: true } as AddEventListenerOptions;
    window.addEventListener("scroll", arm, opts);
    window.addEventListener("pointerdown", arm, opts);
    window.addEventListener("touchstart", arm, opts);
    window.addEventListener("keydown", arm, opts);
    // Safety fallback: arm after 4s so SEO crawlers / no-scroll users still see content.
    const t = window.setTimeout(arm, 4000);
    return () => {
      window.removeEventListener("scroll", arm);
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("touchstart", arm);
      window.removeEventListener("keydown", arm);
      window.clearTimeout(t);
    };
  }, [armed]);

  useEffect(() => {
    if (show || !armed) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, armed, rootMargin]);

  return (
    <div ref={ref} style={!show && minHeight ? { minHeight } : undefined}>
      {show ? children : null}
    </div>
  );
}
