"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { ScormPlayer } from "@/components/scorm/ScormPlayer";
import { useSessionStore } from "@/state/sessionStore";
import * as assignmentsApi from "@/lib/api/resources/assignments";

/**
 * A dedicated tab for finishing a SCORM assignment — opened via
 * `window.open` from the main assignment page rather than that page
 * embedding the player inline, per the client's ask ("open a new tab...
 * after it's done, close the tab"). Still hosts the exact same sandboxed
 * `ScormPlayer` iframe as everywhere else in the app, on this app's own
 * trusted page, rather than navigating this whole tab directly to the
 * uploaded package's own files — that would run the untrusted package with
 * a full top-level browsing context at this app's real origin, letting its
 * JS read this app's own localStorage (including the session token) with
 * no sandbox at all. Opening a real tab to a trusted wrapper page keeps
 * the same isolation the iframe always had; the difference is invisible to
 * the learner.
 */
export default function PlayAssignmentPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const session = useSessionStore((s) => s.session);
  const [done, setDone] = useState(false);

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["assignment", assignmentId, session?.user.id],
    queryFn: () => assignmentsApi.getAssignment(assignmentId, true),
    enabled: !!session,
  });

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => window.close(), 1800);
    return () => clearTimeout(timer);
  }, [done]);

  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading...</p>;
  if (!assignment) return <p className="p-8 text-sm text-text-tertiary">Assignment not found.</p>;

  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-4 p-8">
      {done ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <CheckCircle2 className="size-8 text-success" aria-hidden />
          <p className="text-lg font-semibold text-text-primary">Nice work — you&apos;re done</p>
          <p className="text-sm text-text-tertiary">This tab will close automatically...</p>
        </div>
      ) : (
        <>
          <h1 className="text-lg font-semibold text-text-primary">{assignment.title}</h1>
          <ScormPlayer target={{ assignmentId: assignment.id }} title={assignment.title} onComplete={() => setDone(true)} />
        </>
      )}
    </div>
  );
}
