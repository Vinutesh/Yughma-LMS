"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import * as notesApi from "@/lib/api/resources/notes";

const SAVE_DEBOUNCE_MS = 1500;

/** A learner's own private scratchpad for a lesson — collapsed by default so
 * it doesn't compete with the lesson content, autosaved a beat after typing
 * stops (same best-effort, fire-and-forget pattern as video progress
 * reporting elsewhere in this app). Applies to every content type, not just
 * one, so it's rendered once per lesson rather than nested inside any of the
 * per-content-type blocks above it. */
export function LessonNotes({ lessonId }: { lessonId: string }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const loadedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data } = useQuery({
    queryKey: ["note", lessonId],
    queryFn: () => notesApi.getNote(lessonId),
  });

  // Only ever seeds `body` once, from the first successful load — a later
  // refetch must never clobber what the learner is actively typing.
  useEffect(() => {
    if (data !== undefined && !loadedRef.current) {
      setBody(data);
      loadedRef.current = true;
    }
  }, [data]);

  function handleChange(value: string) {
    setBody(value);
    setStatus("idle");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await notesApi.saveNote(lessonId, value);
        setStatus("saved");
      } catch {
        // Best-effort — the note just stays in this component's own state;
        // the next edit tries again.
        setStatus("idle");
      }
    }, SAVE_DEBOUNCE_MS);
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-text-tertiary hover:text-text-secondary"
      >
        My notes
        {open ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          <textarea
            value={body}
            onChange={(e) => handleChange(e.target.value)}
            rows={4}
            placeholder="Jot down anything you want to remember from this lesson..."
            className="rounded-md border border-border bg-surface p-2.5 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <span className="text-[11px] text-text-tertiary">
            {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : " "}
          </span>
        </div>
      )}
    </div>
  );
}
