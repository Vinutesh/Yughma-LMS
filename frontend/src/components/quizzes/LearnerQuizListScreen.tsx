"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useSessionStore } from "@/state/sessionStore";
import * as quizzesApi from "@/lib/api/resources/quizzes";
import { KIND_COPY } from "@/components/quizzes/kind";
import type { QuizKind } from "@/types/domain";

export function LearnerQuizListScreen({ kind }: { kind: QuizKind }) {
  const copy = KIND_COPY[kind];
  const isAssessment = kind === "assessment";
  const session = useSessionStore((s) => s.session);

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["myQuizzes", session?.org.id, session?.user.id, kind],
    queryFn: () => quizzesApi.listMyQuizzes(kind),
    enabled: !!session,
  });

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">{copy.plural}</h1>
      <p className="mb-5 text-sm text-text-tertiary">
        {isAssessment
          ? "Certification exams from your courses. One attempt each — check the details before starting."
          : "Knowledge checks from the courses you're enrolled in."}
      </p>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading {copy.plural.toLowerCase()}...</p>
      ) : quizzes.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">
            No {copy.plural.toLowerCase()} yet
          </p>
          <p className="text-xs text-text-tertiary">
            {copy.plural} appear here once you&apos;re enrolled in a course that has them.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {quizzes.map((q) => (
            <Card key={q.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <Link
                  href={`${copy.learnerBasePath}/${q.id}`}
                  className="text-sm font-semibold text-text-primary hover:text-accent hover:underline"
                >
                  {q.title}
                </Link>
                <p className="text-xs text-text-tertiary">
                  {q.courseTitle} · {q.questionCount}{" "}
                  {q.questionCount === 1 ? "question" : "questions"}
                  {isAssessment
                    ? ` · pass at ${q.passingScorePercent ?? 0}%`
                    : ` · ${q.totalPoints} pts`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isAssessment && <AvailabilityBadge quiz={q} />}
                {q.timeLimitMinutes && (
                  <Badge variant="neutral">{q.timeLimitMinutes} min limit</Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AvailabilityBadge({ quiz }: { quiz: quizzesApi.QuizSummary }) {
  if (!quiz.availableFrom && !quiz.availableTo) return null;
  const state = quizzesApi.availabilityOf(quiz);
  if (state === "not_yet") return <Badge variant="neutral">Not open yet</Badge>;
  if (state === "closed") return <Badge variant="danger">Closed</Badge>;
  return <Badge variant="success">Open</Badge>;
}
