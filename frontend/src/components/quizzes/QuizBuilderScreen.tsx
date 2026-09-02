"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { ComingSoon } from "@/components/patterns/ComingSoon";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as quizzesApi from "@/lib/api/resources/quizzes";
import * as certificatesApi from "@/lib/api/resources/certificates";
import { AddQuestionDialog } from "@/components/quizzes/AddQuestionDialog";
import { KIND_COPY } from "@/components/quizzes/kind";
import { ApiError } from "@/lib/api/errors";
import type { QuizKind } from "@/types/domain";

export function QuizBuilderScreen({ quizId, kind }: { quizId: string; kind: QuizKind }) {
  const copy = KIND_COPY[kind];
  const canEdit = usePermission("courses", "edit");

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => quizzesApi.getQuiz(quizId),
    enabled: canEdit,
  });

  if (!canEdit) return <ComingSoon title={`${copy.singular} builder`} />;
  if (isLoading) {
    return <p className="p-8 text-sm text-text-tertiary">Loading {copy.singular.toLowerCase()}...</p>;
  }
  if (!quiz) {
    return <p className="p-8 text-sm text-text-tertiary">{copy.singular} not found.</p>;
  }

  // Keyed on the quiz so the settings fields initialize from it once, instead
  // of an effect resyncing them on every refetch (which would discard edits
  // in progress after an unrelated refetch, such as adding a question).
  return <Builder key={quiz.id} quiz={quiz} kind={kind} />;
}

function Builder({ quiz, kind }: { quiz: quizzesApi.QuizDetail; kind: QuizKind }) {
  const copy = KIND_COPY[kind];
  const isAssessment = kind === "assessment";
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const quizId = quiz.id;

  const [title, setTitle] = useState(quiz.title);
  const [timeLimit, setTimeLimit] = useState(
    quiz.timeLimitMinutes ? String(quiz.timeLimitMinutes) : "",
  );
  const [randomize, setRandomize] = useState(quiz.randomizeOrder);
  const [retakes, setRetakes] = useState(String(quiz.retakesAllowed));
  const [passingScore, setPassingScore] = useState(String(quiz.passingScorePercent ?? 80));
  const [availableFrom, setAvailableFrom] = useState(toDateInput(quiz.availableFrom));
  const [availableTo, setAvailableTo] = useState(toDateInput(quiz.availableTo));
  const [proctoring, setProctoring] = useState(quiz.proctoringRequired ?? false);
  const [certificateTemplateId, setCertificateTemplateId] = useState(
    quiz.certificateTemplateId ?? "",
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["certificateTemplates", org?.id],
    queryFn: () => certificatesApi.listTemplates(),
    enabled: !!org && isAssessment,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["quiz", quizId] });
    qc.invalidateQueries({ queryKey: ["quizzes"] });
  };

  const save = useMutation({
    mutationFn: () =>
      quizzesApi.updateQuiz(quizId, {
        title,
        timeLimitMinutes: timeLimit ? Number(timeLimit) : undefined,
        randomizeOrder: randomize,
        // Assessments are single-attempt by definition, so the field isn't
        // offered and stays at zero.
        retakesAllowed: isAssessment ? 0 : Number(retakes),
        ...(isAssessment
          ? {
              passingScorePercent: Number(passingScore),
              availableFrom: fromDateInput(availableFrom),
              availableTo: fromDateInput(availableTo, { endOfDay: true }),
              proctoringRequired: proctoring,
              certificateTemplateId: certificateTemplateId || undefined,
            }
          : {}),
      }),
    onSuccess: () => {
      setError(null);
      invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  const removeQuestion = useMutation({
    mutationFn: (id: string) => quizzesApi.deleteQuestion(quizId, id),
    onSuccess: invalidate,
  });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href={copy.manageBasePath}
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← {copy.plural}
      </Link>

      <h1 className="text-xl font-semibold text-text-primary">{quiz.title}</h1>
      <p className="mb-5 mt-1 text-xs text-text-tertiary">
        {quiz.courseTitle} · {quiz.questionCount}{" "}
        {quiz.questionCount === 1 ? "question" : "questions"} · {quiz.totalPoints} pts
        {isAssessment && ` · pass at ${quiz.passingScorePercent ?? 0}%`}
      </p>

      <div className="mb-4 flex flex-col gap-3">
        {quiz.questions.length === 0 && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <p className="text-sm font-semibold text-text-primary">No questions yet</p>
            <p className="text-xs text-text-tertiary">
              {copy.singular === "Assessment" ? "An assessment" : "A quiz"} needs at least one
              question before a learner can take it.
            </p>
          </Card>
        )}

        {quiz.questions.map((q, i) => (
          <Card key={q.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-text-primary">
                {i + 1}. {q.prompt}{" "}
                <span className="font-normal text-text-tertiary">({q.points} pts)</span>
              </p>
              <Menu>
                <MenuTrigger label={`Actions for question ${i + 1}`} />
                <MenuContent>
                  <MenuItem destructive onSelect={() => removeQuestion.mutate(q.id)}>
                    Delete question
                  </MenuItem>
                </MenuContent>
              </Menu>
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {q.options.map((o) => {
                const correct = o.id === q.correctOptionId;
                return (
                  <li
                    key={o.id}
                    className={
                      "flex items-center gap-2 text-sm " +
                      (correct ? "font-medium text-success" : "text-text-secondary")
                    }
                  >
                    {correct ? (
                      <Check className="size-3.5 shrink-0" />
                    ) : (
                      <span className="size-3.5 shrink-0" />
                    )}
                    {o.text}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}

        <div>
          <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
            + Add question
          </Button>
        </div>
      </div>

      <Card className="flex flex-col gap-4 border-t border-border p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Settings</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q-name">{copy.singular} name</Label>
          <Input id="q-name" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="grid grid-cols-3 items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-time">Time limit (min)</Label>
            <Input
              id="q-time"
              type="number"
              min={0}
              placeholder="None"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={randomize}
              onChange={(e) => setRandomize(e.target.checked)}
              className="size-4 accent-accent"
            />
            <span className="text-text-secondary">Randomize order</span>
          </label>
          {isAssessment ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-pass">Passing score (%)</Label>
              <Input
                id="q-pass"
                type="number"
                min={1}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-retakes">Retakes allowed</Label>
              <Input
                id="q-retakes"
                type="number"
                min={0}
                value={retakes}
                onChange={(e) => setRetakes(e.target.value)}
              />
            </div>
          )}
        </div>

        {isAssessment && (
          <>
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-from">Available from</Label>
                <Input
                  id="q-from"
                  type="date"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-to">Available to</Label>
                <Input
                  id="q-to"
                  type="date"
                  value={availableTo}
                  onChange={(e) => setAvailableTo(e.target.value)}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-text-tertiary">
              Leave both blank to keep it open indefinitely. One attempt only, always.
            </p>

            <div className="flex flex-col gap-1.5 border-t border-border pt-4">
              <Label htmlFor="q-cert">Award certificate on pass</Label>
              <select
                id="q-cert"
                value={certificateTemplateId}
                onChange={(e) => setCertificateTemplateId(e.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
              >
                <option value="">No certificate</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-start gap-2 border-t border-border pt-4 text-sm">
              <input
                type="checkbox"
                checked={proctoring}
                onChange={(e) => setProctoring(e.target.checked)}
                className="mt-0.5 size-4 accent-accent"
              />
              <span>
                <span className="text-text-secondary">Proctoring required</span>
                {/* Called out inline rather than buried in docs: the toggle
                    stores a preference and nothing enforces it yet. */}
                <span className="block text-xs text-warning">
                  Recorded only — no proctoring is enforced in this version.
                </span>
              </span>
            </label>
          </>
        )}

        {error && <p className="text-xs font-medium text-danger">{error}</p>}

        <div className="flex items-center gap-3">
          <Button disabled={!title.trim()} loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
          {saved && <span className="text-xs font-medium text-success">Saved</span>}
        </div>
      </Card>

      <AddQuestionDialog
        quizId={quizId}
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={invalidate}
      />
    </div>
  );
}

/** `<input type="date">` wants YYYY-MM-DD; the store keeps full ISO strings. */
function toDateInput(iso?: string) {
  return iso ? iso.slice(0, 10) : "";
}

function fromDateInput(value: string, opts: { endOfDay?: boolean } = {}) {
  if (!value) return undefined;
  // A closing date means "through the end of that day", not midnight at its
  // start — otherwise setting "closes Aug 31" locks people out all of Aug 31.
  return new Date(`${value}T${opts.endOfDay ? "23:59:59" : "00:00:00"}`).toISOString();
}
