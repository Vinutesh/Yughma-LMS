import { useEffect, useState, type RefObject } from "react";

/**
 * Tracks real browser fullscreen on the given element and exposes `enter()`
 * to request it. `enter()` must be called synchronously from an actual user
 * gesture (a click) — browsers reject `requestFullscreen()` otherwise, and a
 * fresh tab's own mount/effect never counts as one even though `window.open()`
 * opened it. See the play pages' "begin" gate: they call this from the
 * button's own `onClick`, not from an effect on mount — an earlier version
 * tried the mount-effect approach and had a second bug on top of that
 * unreliability: the ref it auto-attempted on was still null while the page
 * was in its loading state, so the attempt silently no-opped and the
 * fallback button (gated on the attempt having failed) never appeared either.
 */
export function useFullscreenState(ref: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(document.fullscreenElement === ref.current);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [ref]);

  function enter() {
    return ref.current?.requestFullscreen().catch(() => {}) ?? Promise.resolve();
  }

  return { isFullscreen, enter };
}
