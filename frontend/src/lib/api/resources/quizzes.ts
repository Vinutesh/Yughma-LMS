import type { Quiz, QuizAttempt, QuizKind, QuizQuestion, QuizQuestionType } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined } from "@/lib/api/serialization";


function toDateStrings<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]): T {
  const out: Record<string, unknown> = { ...obj };
  for (const key of keys) {
    const v = out[key as string];
    if (v instanceof Date) out[key as string] = v.toISOString();
  }
  return out as T;
}

export interface QuizSummary extends Quiz {
  courseTitle: string;
  questionCount: number;
  totalPoints: number;
  attemptCount: number;
}

function toQuizSummary(q: Record<string, unknown>): QuizSummary {
  return toDateStrings(nullsToUndefined(q), ["createdAt", "availableFrom", "availableTo"]) as unknown as QuizSummary;
}

/** Quizzes and assessments are the same records, listed separately — the two
 * live under their own nav items and shouldn't bleed into each other. */
export async function listQuizzes(kind: QuizKind = "quiz"): Promise<QuizSummary[]> {
  try {
    const quizzes = await trpcClient.quizzes.list.query({ kind });
    return quizzes.map(toQuizSummary);
  } catch (err) {
    throw toApiError(err);
  }
}

export interface QuizDetail extends QuizSummary {
  questions: QuizQuestion[];
}

/** Authoring/manage view — includes `correctOptionId`. Requires `courses:edit`
 * on the backend; never call this for a learner-facing screen (see `getMyQuizState`). */
export async function getQuiz(quizId: string): Promise<QuizDetail> {
  try {
    const q = await trpcClient.quizzes.get.query({ quizId });
    return {
      ...toQuizSummary(q),
      questions: q.questions as unknown as QuizQuestion[],
    };
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createQuiz(input: { courseId: string; title: string; kind?: QuizKind }): Promise<Quiz> {
  try {
    const q = await trpcClient.quizzes.create.mutate(input);
    return toDateStrings(nullsToUndefined(q), ["createdAt", "availableFrom", "availableTo"]) as unknown as Quiz;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateQuiz(
  quizId: string,
  patch: Partial<
    Pick<
      Quiz,
      | "title"
      | "timeLimitMinutes"
      | "randomizeOrder"
      | "retakesAllowed"
      | "passingScorePercent"
      | "availableFrom"
      | "availableTo"
      | "proctoringRequired"
      | "certificateTemplateId"
    >
  >,
): Promise<void> {
  try {
    await trpcClient.quizzes.update.mutate({
      quizId,
      ...patch,
      availableFrom: patch.availableFrom === undefined ? undefined : patch.availableFrom ? new Date(patch.availableFrom) : null,
      availableTo: patch.availableTo === undefined ? undefined : patch.availableTo ? new Date(patch.availableTo) : null,
    });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteQuiz(quizId: string): Promise<void> {
  try {
    await trpcClient.quizzes.delete.mutate({ quizId });
  } catch (err) {
    throw toApiError(err);
  }
}

export interface AddQuestionInput {
  quizId: string;
  type: QuizQuestionType;
  prompt: string;
  /** For "truefalse" this is ignored — True/False are supplied automatically. */
  optionTexts: string[];
  /** Index into optionTexts (or 0=True, 1=False for truefalse). */
  correctIndex: number;
  points: number;
}

export async function addQuestion(input: AddQuestionInput): Promise<QuizQuestion> {
  try {
    const q = await trpcClient.quizzes.addQuestion.mutate(input);
    return q as unknown as QuizQuestion;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteQuestion(quizId: string, questionId: string): Promise<void> {
  try {
    await trpcClient.quizzes.deleteQuestion.mutate({ quizId, questionId });
  } catch (err) {
    throw toApiError(err);
  }
}

export type AvailabilityState = "open" | "not_yet" | "closed";

export interface QuizAttemptState {
  quiz: QuizDetail;
  /** The learner's most recent submitted attempt, if any. */
  lastAttempt: QuizAttempt | null;
  attemptsUsed: number;
  /** False once the single attempt plus every allowed retake is spent. */
  canAttempt: boolean;
  /** Always "open" for plain quizzes — only assessments carry a window. */
  availability: AvailabilityState;
  /** Assessment only: whether the last attempt cleared the passing score. */
  passed?: boolean;
  scorePercent?: number;
}

export function availabilityOf(quiz: Quiz): AvailabilityState {
  const now = Date.now();
  if (quiz.availableFrom && now < new Date(quiz.availableFrom).getTime()) return "not_yet";
  if (quiz.availableTo && now > new Date(quiz.availableTo).getTime()) return "closed";
  return "open";
}

/** Learner-facing state — questions never include `correctOptionId` (the
 * backend strips it entirely, not just nulls it, before this ever sees it). */
export async function getMyQuizState(quizId: string): Promise<QuizAttemptState> {
  try {
    // Cast escapes tRPC's inferred type early — the client's type says every
    // Date-typed field is a real `Date` (copied from the server's Prisma
    // types), but no superjson transformer is configured, so every response
    // actually arrives as a JSON string. Threading that mismatch through
    // this function's own structural checks (compounded by `QuizQuestion`'s
    // recursive `Json` `options` field) is what pushes the type checker past
    // its recursion limit — the runtime `new Date(...)` conversions below are
    // still real and necessary, this only removes the compile-time noise
    // around a wire format tRPC's own types don't reflect.
    const result = (await trpcClient.quizzes.myState.query({ quizId })) as unknown as {
      quiz: QuizDetail & { createdAt: string; availableFrom: string | null; availableTo: string | null };
      lastAttempt: (Omit<QuizAttempt, "startedAt" | "submittedAt"> & { startedAt: string; submittedAt: string | null }) | null;
      attemptsUsed: number;
      canAttempt: boolean;
      availability: AvailabilityState;
      passed?: boolean;
      scorePercent?: number;
    };
    const quiz = result.quiz;
    return {
      quiz: {
        ...quiz,
        createdAt: new Date(quiz.createdAt).toISOString(),
        availableFrom: quiz.availableFrom ? new Date(quiz.availableFrom).toISOString() : undefined,
        availableTo: quiz.availableTo ? new Date(quiz.availableTo).toISOString() : undefined,
        questions: quiz.questions.map((q) => ({ ...q, correctOptionId: "" })),
      },
      lastAttempt: result.lastAttempt
        ? {
            ...result.lastAttempt,
            startedAt: new Date(result.lastAttempt.startedAt).toISOString(),
            submittedAt: result.lastAttempt.submittedAt ? new Date(result.lastAttempt.submittedAt).toISOString() : undefined,
          }
        : null,
      attemptsUsed: result.attemptsUsed,
      canAttempt: result.canAttempt,
      availability: result.availability,
      passed: result.passed,
      scorePercent: result.scorePercent,
    };
  } catch (err) {
    throw toApiError(err);
  }
}

export interface AttemptResult {
  attempt: QuizAttempt;
  scorePercent: number;
  /** Assessment only. */
  passed?: boolean;
  /** Set when passing an assessment earned a certificate. */
  certificateId?: string;
}

export async function submitAttempt(input: {
  quizId: string;
  answers: Record<string, string>;
  /** Set when the time limit ran out — blanks score zero instead of blocking
   * the submit, since the learner no longer has the chance to fill them in. */
  timeExpired?: boolean;
}): Promise<AttemptResult> {
  try {
    // See `getMyQuizState`'s comment — same wire-format/recursive-Json
    // mismatch, same escape hatch.
    const result = (await trpcClient.quizzes.submitAttempt.mutate(input)) as unknown as {
      attempt: Omit<QuizAttempt, "startedAt" | "submittedAt"> & { startedAt: string; submittedAt: string | null };
      scorePercent: number;
      passed?: boolean;
      certificateId?: string;
    };
    return {
      ...result,
      attempt: {
        ...result.attempt,
        startedAt: new Date(result.attempt.startedAt).toISOString(),
        submittedAt: result.attempt.submittedAt ? new Date(result.attempt.submittedAt).toISOString() : undefined,
      },
    };
  } catch (err) {
    throw toApiError(err);
  }
}

/** Quizzes (or assessments) on courses the learner is actively enrolled in. */
export async function listMyQuizzes(kind: QuizKind = "quiz"): Promise<QuizSummary[]> {
  try {
    const quizzes = await trpcClient.quizzes.mine.query({ kind });
    return quizzes.map(toQuizSummary);
  } catch (err) {
    throw toApiError(err);
  }
}
