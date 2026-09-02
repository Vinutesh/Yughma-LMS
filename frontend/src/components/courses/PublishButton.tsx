"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import * as coursesApi from "@/lib/api/resources/courses";
import type { CourseDetail } from "@/lib/api/resources/courses";
import { ApiError } from "@/lib/api/errors";
export function PublishButton({ course }: { course: CourseDetail }) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  const publish = useMutation({
    mutationFn: () => coursesApi.publishCourse(course.id),
    onSuccess: () => {
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["course", course.id] });
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (err) => {
      setConfirmOpen(false);
      if (err instanceof ApiError) setBlocked(err.message);
    },
  });

  if (course.status === "published") {
    return (
      <Button variant="secondary" disabled>
        Published
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setConfirmOpen(true)}>Publish</Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish &ldquo;{course.title}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            Learners with an access grant will be able to see it.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button loading={publish.isPending} onClick={() => publish.mutate()}>
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!blocked} onOpenChange={(open) => !open && setBlocked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Can&apos;t publish yet</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">{blocked}</p>
          <DialogFooter>
            <Button onClick={() => setBlocked(null)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
