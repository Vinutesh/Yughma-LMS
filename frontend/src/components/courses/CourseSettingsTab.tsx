"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useSessionStore } from "@/state/sessionStore";
import * as coursesApi from "@/lib/api/resources/courses";
import * as skillsApi from "@/lib/api/resources/skills";
import * as certificatesApi from "@/lib/api/resources/certificates";
import type { CourseDetail } from "@/lib/api/resources/courses";
import { ApiError } from "@/lib/api/errors";

export function CourseSettingsTab({ course }: { course: CourseDetail }) {
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [saved, setSaved] = useState(false);
  const [prereqError, setPrereqError] = useState<string | null>(null);
  const [prereqToAdd, setPrereqToAdd] = useState("");

  const { data: allCourses = [] } = useQuery({
    queryKey: ["courses", org?.id],
    queryFn: () => coursesApi.listCourses(),
    enabled: !!org,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["course", course.id] });

  const saveBasics = useMutation({
    mutationFn: () => coursesApi.updateCourse(course.id, { title, description }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["courses"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const addPrereq = useMutation({
    mutationFn: (id: string) => coursesApi.addPrerequisite(course.id, id),
    onSuccess: () => {
      setPrereqError(null);
      setPrereqToAdd("");
      invalidate();
    },
    onError: (err) => {
      if (err instanceof ApiError) setPrereqError(err.message);
    },
  });

  const removePrereq = useMutation({
    mutationFn: (id: string) => coursesApi.removePrerequisite(course.id, id),
    onSuccess: invalidate,
  });

  const candidates = allCourses.filter(
    (c) => c.id !== course.id && !course.prerequisites.some((p) => p.id === c.id),
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-title">Title</Label>
          <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-desc">Description</Label>
          <textarea
            id="c-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-md border border-border bg-surface p-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            disabled={!title.trim()}
            loading={saveBasics.isPending}
            onClick={() => saveBasics.mutate()}
          >
            Save
          </Button>
          {saved && <span className="text-xs font-medium text-success">Saved</span>}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Prerequisites
        </p>
        {course.prerequisites.length === 0 ? (
          <p className="text-xs text-text-tertiary">None — learners can start straight away.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {course.prerequisites.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm text-text-secondary"
              >
                {p.title}
                <button
                  aria-label={`Remove ${p.title}`}
                  onClick={() => removePrereq.mutate(p.id)}
                  className="rounded p-0.5 text-text-tertiary hover:text-danger"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {prereqError && (
          <p className="rounded-md bg-warning-bg p-2.5 text-xs font-medium text-warning">
            ⚠ {prereqError}
          </p>
        )}

        {candidates.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              aria-label="Add prerequisite"
              value={prereqToAdd}
              onChange={(e) => setPrereqToAdd(e.target.value)}
              className="h-9 flex-1 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
            >
              <option value="">Add prerequisite...</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              disabled={!prereqToAdd}
              loading={addPrereq.isPending}
              onClick={() => addPrereq.mutate(prereqToAdd)}
            >
              Add
            </Button>
          </div>
        )}
      </Card>

      <SkillsCard course={course} onSaved={invalidate} />
      <CertificateCard course={course} onSaved={invalidate} />
    </div>
  );
}

/** Skill mapping lives in Course Settings rather than getting its own screen —
 * see LMS/docs/modules/16-skills/00-open-questions.md. */
function SkillsCard({ course, onSaved }: { course: CourseDetail; onSaved: () => void }) {
  const org = useSessionStore((s) => s.session?.org);
  const [toAdd, setToAdd] = useState("");

  const { data: skills = [] } = useQuery({
    queryKey: ["skills", org?.id],
    queryFn: () => skillsApi.listSkills(),
    enabled: !!org,
  });

  // Course→skill mapping isn't wired to the real backend yet (`CourseSkill`
  // has no router this pass — see BACKEND_PLAN.md) — `course.skillIds` is
  // always `[]` from a real response, so this always throws rather than
  // silently no-op-ing against a field the backend would just ignore.
  const save = useMutation({
    mutationFn: async (_skillIds: string[]) => {
      throw new ApiError("validation", "Mapping skills to courses isn't available yet — check back soon.");
    },
    onSuccess: () => {
      setToAdd("");
      onSaved();
    },
  });

  const mapped = skills.filter((s) => course.skillIds.includes(s.id));
  const candidates = skills.filter((s) => !course.skillIds.includes(s.id));

  return (
    <Card className="flex flex-col gap-3 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        Skills this course builds
      </p>

      {mapped.length === 0 ? (
        <p className="text-xs text-text-tertiary">
          None yet. Mapped skills show up on each learner&apos;s My Skills screen once they finish
          the course.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {mapped.map((skill) => (
            <span
              key={skill.id}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-2.5 py-1 text-xs font-medium text-text-secondary"
            >
              {skill.name}
              <button
                aria-label={`Remove ${skill.name}`}
                onClick={() => save.mutate(course.skillIds.filter((id) => id !== skill.id))}
                className="rounded text-text-tertiary hover:text-danger"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {candidates.length > 0 ? (
        <div className="flex items-center gap-2">
          <select
            aria-label="Add skill"
            value={toAdd}
            onChange={(e) => setToAdd(e.target.value)}
            className="h-9 flex-1 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
          >
            <option value="">Add skill...</option>
            {candidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!toAdd}
            loading={save.isPending}
            onClick={() => save.mutate([...course.skillIds, toAdd])}
          >
            Add
          </Button>
        </div>
      ) : (
        skills.length === 0 && (
          <p className="text-xs text-text-tertiary">
            No skills exist yet — create some under Skills first.
          </p>
        )
      )}
    </Card>
  );
}

/** Awarding a certificate on completion is a Course Settings toggle rather than
 * its own screen, matching how skill mapping is handled. */
function CertificateCard({ course, onSaved }: { course: CourseDetail; onSaved: () => void }) {
  const org = useSessionStore((s) => s.session?.org);

  const { data: templates = [] } = useQuery({
    queryKey: ["certificateTemplates", org?.id],
    queryFn: () => certificatesApi.listTemplates(),
    enabled: !!org,
  });

  const save = useMutation({
    mutationFn: (certificateTemplateId: string | undefined) =>
      coursesApi.updateCourse(course.id, { certificateTemplateId }),
    onSuccess: onSaved,
  });

  return (
    <Card className="flex flex-col gap-3 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        Award certificate on completion
      </p>
      <select
        aria-label="Certificate awarded on completion"
        value={course.certificateTemplateId ?? ""}
        onChange={(e) => save.mutate(e.target.value || undefined)}
        className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
      >
        <option value="">No certificate</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-text-tertiary">
        Issued automatically the moment a learner finishes every lesson.
      </p>
    </Card>
  );
}
