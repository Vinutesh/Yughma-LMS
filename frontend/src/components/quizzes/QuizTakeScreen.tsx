"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Check, Timer, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useSessionStore } from "@/state/sessionStore";
import * as quizzesApi from "@/lib/api/resources/quizzes";
import { ApiError } from "@/lib/api/errors";
import { KIND_COPY } from "@/components/quizzes/kind";
import type { QuizKind } from "@/types/domain";

export function QuizTakeScreen({ quizId, kind }: { quizId: string; kind: QuizKind }) {
  const copy = KIND_COPY[kind];
  const isAssessment = kind === "assessment";
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();

  const [taking, setTaking] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Question order for the attempt in progress. Fixed when the attempt starts
   * so the list doesn't reshuffle under the learner on every re-render. */
  const [askOrder, setAskOrder] = useState<string[]>([]);
  /** Certificate minted by this submission, so the result can link straight to it. */
  const [awardedCertificateId, setAwardedCertificateId] = useState<string | null>(null);

  const { data: state, isLoading } = useQuery({
    queryKey: ["quizState", quizId, session?.user.id],
    queryFn: () => quizzesApi.getMyQuizState(quizId),
    enabled: !!session,
  });

  const submit = useMutation({
    mutationFn: (timeExpired: boolean) =>
      quizzesApi.submitAttempt({
        quizId,
        answers,
        timeExpired,
      }),
    onSuccess: (result) => {
      setError(null);
      setTaking(false);
      setSecondsLeft(null);
      setAwardedCertificateId(result.certificateId ?? null);
      qc.invalidateQueries({ queryKey: ["quizState", quizId] });
      qc.invalidateQueries({ queryKey: ["myQuizzes"] });
      qc.invalidateQueries({ queryKey: ["myCertificates"] });
      qc.invalidateQueries({ queryKey: ["certificates"] });
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  // Kept in a ref so the countdown effect doesn't need `submit` as a dependency,
  // which would restart the countdown on every mutation state change.
  const submitRef = useRef(submit.mutate);
  useEffect(() => {
    submitRef.current = submit.mutate;
  }, [submit.mutate]);

  useEffect(() => {
    if (!taking || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      submitRef.current(true);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [taking, secondsLeft]);

  const startAttempt = useCallback(() => {
    const questions = state?.quiz.questions ?? [];
    const ids = questions.map((q) => q.id);
    if (state?.quiz.randomizeOrder) {
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
    }
    setAskOrder(ids);
    setAnswers({});
    setError(null);
    setTaking(true);
    setSecondsLeft(state?.quiz.timeLimitMinutes ? state.quiz.timeLimitMinutes * 60 : null);
  }, [state]);

  if (isLoading) {
    return <p className="p-8 text-sm text-text-tertiary">Loading {copy.singular.toLowerCase()}...</p>;
  }
  if (!state) return <p className="p-8 text-sm text-text-tertiary">{copy.singular} not found.</p>;

  const { quiz, lastAttempt, attemptsUsed, canAttempt, availability, passed, scorePercent } = state;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href={copy.learnerBasePath}
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← {copy.plural}
      </Link>

      <div className="mb-1 flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold text-text-primary">{quiz.title}</h1>
        {taking && secondsLeft !== null && (
          <Badge variant={secondsLeft < 60 ? "danger" : "neutral"} className="shrink-0">
            <Timer className="size-3" />
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} remaining
          </Badge>
        )}
        {!taking && lastAttempt?.score !== undefined && (
          <Badge variant={isAssessment ? (passed ? "success" : "danger") : "success"} className="shrink-0">
            {isAssessment
              ? `Result: ${passed ? "Pass" : "Fail"} (${scorePercent}%)`
              : `Score: ${lastAttempt.score}/${quiz.totalPoints}`}
          </Badge>
        )}
      </div>
      <p className="mb-5 text-xs text-text-tertiary">
        {quiz.courseTitle} · {quiz.questionCount}{" "}
        {quiz.questionCount === 1 ? "question" : "questions"} · {quiz.totalPoints} pts
        {isAssessment && ` · passing score ${quiz.passingScorePercent ?? 0}%`}
        {quiz.timeLimitMinutes && ` · ${quiz.timeLimitMinutes} min limit`}
      </p>

      {error && (
        <p className="mb-4 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}

      {quiz.questions.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">
            This {copy.singular.toLowerCase()} has no questions yet
          </p>
          <p className="text-xs text-text-tertiary">Check back once the instructor adds some.</p>
        </Card>
      ) : !lastAttempt && !taking && availability !== "open" ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">
            {availability === "not_yet" ? "Not available yet" : "This assessment has closed"}
          </p>
          <p className="text-xs text-text-tertiary">{windowSentence(quiz)}</p>
        </Card>
      ) : taking ? (
        <>
          <div className="flex flex-col gap-4">
            {askOrder.map((id, i) => {
              const q = quiz.questions.find((question) => question.id === id);
              if (!q) return null;
              return (
                <Card key={q.id} className="p-4">
                  <p className="mb-2.5 text-sm font-medium text-text-primary">
                    {i + 1}. {q.prompt}{" "}
                    <span className="font-normal text-text-tertiary">({q.points} pts)</span>
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((o) => (
                      <label key={o.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === o.id}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: o.id }))}
                          className="accent-accent"
                        />
                        <span className="text-text-secondary">{o.text}</span>
                      </label>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="mt-5 flex justify-end">
            <Button loading={submit.isPending} onClick={() => submit.mutate(false)}>
              Submit
            </Button>
          </div>
        </>
      ) : lastAttempt ? (
        <>
          {isAssessment && (
            <Card
              className={
                "mb-4 flex flex-col items-center gap-2 p-6 text-center " +
                (passed ? "border-success" : "border-danger")
              }
            >
              {passed ? (
                <>
                  <p className="text-sm font-semibold text-success">
                    Passed with {scorePercent}%
                  </p>
                  {awardedCertificateId ? (
                    <>
                      <p className="flex items-center gap-1.5 text-sm text-text-secondary">
                        <Award className="size-4 text-accent" />
                        Certificate earned
                      </p>
                      <Button size="sm" asChild>
                        <Link href="/certificates">View certificate →</Link>
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-text-tertiary">
                      Nice work — this one doesn&apos;t carry a certificate.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-danger">
                    Did not pass — {scorePercent}%
                  </p>
                  <p className="text-xs text-text-tertiary">
                    You needed {quiz.passingScorePercent ?? 0}% to pass. This was your only attempt.
                  </p>
                </>
              )}
            </Card>
          )}

          <div className="flex flex-col gap-4">
            {quiz.questions.map((q, i) => {
              const chosen = lastAttempt.answers[q.id];
              const correct = chosen === q.correctOptionId;
              const chosenOption = q.options.find((o) => o.id === chosen);
              const correctOption = q.options.find((o) => o.id === q.correctOptionId);
              return (
                <Card key={q.id} className="p-4">
                  <p className="mb-2 text-sm font-medium text-text-primary">
                    {i + 1}. {q.prompt}
                  </p>
                  <p
                    className={
                      "flex items-center gap-2 text-sm " +
                      (correct ? "text-success" : "text-danger")
                    }
                  >
                    {correct ? <Check className="size-4" /> : <X className="size-4" />}
                    {chosenOption ? chosenOption.text : "No answer"}
                    <span className="text-xs text-text-tertiary">
                      {correct ? "(your answer, correct)" : "(your answer)"}
                    </span>
                  </p>
                  {!correct && (
                    <p className="mt-1 text-xs text-text-tertiary">
                      Correct answer: {correctOption?.text}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs text-text-tertiary">
              {attemptsUsed} of {quiz.retakesAllowed + 1}{" "}
              {quiz.retakesAllowed + 1 === 1 ? "attempt" : "attempts"} used
            </span>
            {canAttempt && <Button onClick={startAttempt}>Retake →</Button>}
          </div>
        </>
      ) : (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">
            {isAssessment ? quiz.title : "Ready when you are"}
          </p>
          {isAssessment ? (
            <>
              <p className="text-xs text-text-tertiary">
                {quiz.questionCount} {quiz.questionCount === 1 ? "question" : "questions"} · Passing
                score: {quiz.passingScorePercent ?? 0}%
              </p>
              {/* The single-attempt warning is the whole point of the pre-start
                  screen — it must be unmissable, not fine print. */}
              <p className="text-sm font-semibold text-warning">
                You have ONE attempt — make sure you&apos;re ready before starting.
              </p>
              {quiz.proctoringRequired && (
                <p className="text-xs text-text-tertiary">
                  This assessment is marked as proctored.
                </p>
              )}
              {(quiz.availableFrom || quiz.availableTo) && (
                <p className="text-xs text-text-tertiary">{windowSentence(quiz)}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-text-tertiary">
              {quiz.retakesAllowed > 0
                ? `You get ${quiz.retakesAllowed + 1} attempts.`
                : "You get one attempt."}
              {quiz.timeLimitMinutes && ` The timer starts as soon as you begin.`}
            </p>
          )}
          <Button onClick={startAttempt}>Start {isAssessment ? "attempt" : "quiz"}</Button>
        </Card>
      )}
    </div>
  );
}

function windowSentence(quiz: quizzesApi.QuizDetail) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (quiz.availableFrom && quiz.availableTo) {
    return `This assessment opens ${fmt(quiz.availableFrom)} and closes ${fmt(quiz.availableTo)}.`;
  }
  if (quiz.availableFrom) return `This assessment opens ${fmt(quiz.availableFrom)}.`;
  if (quiz.availableTo) return `This assessment closes ${fmt(quiz.availableTo)}.`;
  return "";
}
