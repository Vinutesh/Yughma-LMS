import { useEffect, useState, type RefObject } from "react";

/**
 * Tries to enter real browser fullscreen on the given element as soon as
 * it mounts. Browsers often reject `requestFullscreen()` unless it's called
 * synchronously inside a user gesture — a fresh tab's own mount script
 * usually doesn't count, even though `window.open()` opened it — so this
 * exposes `blocked` for the caller to show an explicit "Enter fullscreen"
 * button as a fallback; a real click on that button always satisfies the
 * gesture requirement.
 */
export function useAutoFullscreen(ref: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(document.fullscreenElement === ref.current);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [ref]);

  function enter() {
    const el = ref.current;
    if (!el) return;
    el.requestFullscreen()
      .then(() => setBlocked(false))
      .catch(() => setBlocked(true));
  }

  useEffect(() => {
    enter();
    // Attempt once on mount only — repeated auto-attempts would just keep
    // failing the same way if the browser blocked the first one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isFullscreen, blocked, enter };
}
