import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { router, requirePermission, protectedProcedure } from "../trpc/trpc.js";
import type { ScopedDb } from "../trpc/context.js";
import type { rawPrisma } from "../db.js";
import { issueCertificate } from "./certificates.js";

type RawDb = typeof rawPrisma;

/**
 * Mirrors `frontend/src/lib/api/resources/quizzes.ts`. `Quiz` is directly
 * tenant-scoped; `QuizQuestion` and `QuizAttempt` are not (see
 * tenantScope.ts) — every resolver below that touches one of those by an id
 * from the request first resolves the parent `Quiz` via `ctx.db` (which
 * returns null for a cross-org row) and only then touches the child. Same
 * pattern `courses.ts`/`assignments.ts` use for their own unscoped children.
 *
 * One real security boundary the mock couldn't have, since it has no server
 * at all: `get` (the authoring/manage view, which legitimately includes
 * `correctOptionId`) is gated behind `courses:edit`, never reachable from
 * `protectedProcedure` alone. The learner-facing read is `myState`, which
 * strips `correctOptionId` from every question before it ever leaves this
 * file — see the SECURITY NOTE on the mock's `getQuiz` for why that split
 * matters: answers must never reach the network tab before an attempt is
 * submitted.
 */

type QuizOption = { id: string; text: string };

function readOptions(options: Prisma.JsonValue): QuizOption[] {
  return options as unknown as QuizOption[];
}

async function summarize(db: RawDb, quiz: Awaited<ReturnType<ScopedDb["quiz"]["findFirstOrThrow"]>>) {
  const [course, questions, attemptCount] = await Promise.all([
    db.course.findUnique({ where: { id: quiz.courseId }, select: { title: true } }),
    db.quizQuestion.findMany({ where: { quizId: quiz.id } }),
    db.quizAttempt.count({ where: { quizId: quiz.id, submittedAt: { not: null } } }),
  ]);
  return {
    ...quiz,
    courseTitle: course?.title ?? "Unknown course",
    questionCount: questions.length,
    totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
    attemptCount,
  };
}

type AvailabilityState = "open" | "not_yet" | "closed";

/** Reimplemented against real `Date` objects — the mock's version parses
 * ISO strings, since that's what `Quiz.availableFrom`/`availableTo` are in
 * the mock store; here they come back from Prisma as `Date | null` already. */
function availabilityOf(quiz: { availableFrom: Date | null; availableTo: Date | null }): AvailabilityState {
  const now = Date.now();
  if (quiz.availableFrom && now < quiz.availableFrom.getTime()) return "not_yet";
  if (quiz.availableTo && now > quiz.availableTo.getTime()) return "closed";
  return "open";
}

export const quizzesRouter = router({
  /** Quizzes and assessments are the same records, listed separately — the
   * two live under their own nav items and shouldn't bleed into each other. */
  list: requirePermission("courses", "view")
    .input(z.object({ kind: z.enum(["quiz", "assessment"]).default("quiz") }))
    .query(async ({ ctx, input }) => {
      const quizzes = await ctx.db.quiz.findMany({ where: { kind: input.kind }, orderBy: { createdAt: "desc" } });
      return Promise.all(quizzes.map((q) => summarize(ctx.rawDb, q)));
    }),

  /** Authoring/manage view — includes `correctOptionId`, so it's gated
   * behind `courses:edit`, never `protectedProcedure` alone. */
  get: requirePermission("courses", "edit")
    .input(z.object({ quizId: z.string() }))
    .query(async ({ ctx, input }) => {
      const quiz = await ctx.db.quiz.findUnique({ where: { id: input.quizId } });
      if (!quiz) throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found." });
      const questions = await ctx.db.quizQuestion.findMany({
        where: { quizId: input.quizId },
        orderBy: { order: "asc" },
      });
      return { ...(await summarize(ctx.rawDb, quiz)), questions: questions.map((q) => ({ ...q, options: readOptions(q.options) })) };
    }),

  create: requirePermission("courses", "edit")
    .input(z.object({ courseId: z.string(), title: z.string(), kind: z.enum(["quiz", "assessment"]).default("quiz") }))
    .mutation(async ({ ctx, input }) => {
      const label = input.kind === "assessment" ? "Assessment" : "Quiz";
      if (!input.title.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: `${label} title is required.` });
      const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });

      return ctx.db.quiz.create({
        data: {
          orgId: ctx.session.orgId,
          courseId: input.courseId,
          title: input.title.trim(),
          kind: input.kind,
          randomizeOrder: false,
          // Assessments are single-attempt by definition on creation.
          retakesAllowed: 0,
          ...(input.kind === "assessment" ? { passingScorePercent: 80, proctoringRequired: false } : {}),
          createdByUserId: ctx.session.userId,
        },
      });
    }),

  update: requirePermission("courses", "edit")
    .input(
      z.object({
        quizId: z.string(),
        title: z.string().optional(),
        timeLimitMinutes: z.number().int().positive().nullable().optional(),
        randomizeOrder: z.boolean().optional(),
        retakesAllowed: z.number().int().optional(),
        passingScorePercent: z.number().int().nullable().optional(),
        availableFrom: z.coerce.date().nullable().optional(),
        availableTo: z.coerce.date().nullable().optional(),
        proctoringRequired: z.boolean().optional(),
        certificateTemplateId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input: { quizId, ...patch } }) => {
      if (patch.title !== undefined && !patch.title.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Title is required." });
      }
      if (patch.retakesAllowed !== undefined && patch.retakesAllowed < 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Retakes can't be negative." });
      }
      if (
        patch.passingScorePercent !== undefined &&
        patch.passingScorePercent !== null &&
        (patch.passingScorePercent < 1 || patch.passingScorePercent > 100)
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Passing score must be between 1 and 100." });
      }
      if (patch.availableFrom && patch.availableTo && patch.availableFrom > patch.availableTo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The opening date must come before the closing date." });
      }

      const quiz = await ctx.db.quiz.findUnique({ where: { id: quizId } });
      if (!quiz) throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found." });

      return ctx.db.quiz.update({ where: { id: quizId }, data: { ...patch, title: patch.title?.trim() } });
    }),

  delete: requirePermission("courses", "edit")
    .input(z.object({ quizId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const quiz = await ctx.db.quiz.findUnique({ where: { id: input.quizId } });
      if (!quiz) throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found." });

      const attemptCount = await ctx.db.quizAttempt.count({ where: { quizId: input.quizId, submittedAt: { not: null } } });
      if (attemptCount > 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "People have already taken this quiz. It can't be deleted." });
      }
      await ctx.db.quiz.delete({ where: { id: input.quizId } });
      return { ok: true };
    }),

  addQuestion: requirePermission("courses", "edit")
    .input(
      z.object({
        quizId: z.string(),
        type: z.enum(["mcq", "truefalse"]),
        prompt: z.string(),
        /** Ignored for "truefalse" — True/False are supplied automatically. */
        optionTexts: z.array(z.string()),
        /** Index into optionTexts (or 0=True, 1=False for truefalse). */
        correctIndex: z.number().int(),
        points: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const quiz = await ctx.db.quiz.findUnique({ where: { id: input.quizId } });
      if (!quiz) throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found." });

      if (!input.prompt.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "Question text is required." });
      if (input.points <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Points must be greater than zero." });

      const texts =
        input.type === "truefalse" ? ["True", "False"] : input.optionTexts.map((t) => t.trim()).filter(Boolean);

      if (input.type === "mcq" && texts.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Give the question at least two options." });
      }
      if (input.correctIndex < 0 || input.correctIndex >= texts.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mark which option is correct." });
      }

      const order = await ctx.db.quizQuestion.count({ where: { quizId: input.quizId } });
      const options: QuizOption[] = texts.map((text) => ({ id: `o_${crypto.randomUUID().slice(0, 8)}`, text }));

      return ctx.db.quizQuestion.create({
        data: {
          quizId: input.quizId,
          order,
          type: input.type,
          prompt: input.prompt.trim(),
          options: options as unknown as Prisma.InputJsonValue,
          correctOptionId: options[input.correctIndex].id,
          points: input.points,
        },
      });
    }),

  deleteQuestion: requirePermission("courses", "edit")
    .input(z.object({ quizId: z.string(), questionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const quiz = await ctx.db.quiz.findUnique({ where: { id: input.quizId } });
      if (!quiz) throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found." });
      await ctx.db.quizQuestion.deleteMany({ where: { id: input.questionId, quizId: input.quizId } });
      return { ok: true };
    }),

  /**
   * Learner-facing read. Enrollment-gated the same way `courses.get`'s
   * `learnerContext` is — direct navigation to a quiz/assessment for a
   * course the learner isn't enrolled in must fail the same way, or its
   * questions (and answers, if this leaked `correctOptionId`) would be
   * reachable by anyone who knows or guesses the id. `correctOptionId` is
   * omitted from every question below, not just nulled out.
   */
  myState: protectedProcedure.input(z.object({ quizId: z.string() })).query(async ({ ctx, input }) => {
    // `Quiz` now lives in the platform org — `ctx.rawDb` here, deliberately,
    // with the enrollment check below as the actual access decision.
    const quiz = await ctx.rawDb.quiz.findUnique({ where: { id: input.quizId } });
    if (!quiz) throw new TRPCError({ code: "NOT_FOUND", message: "Not found." });

    const enrollment = await ctx.rawDb.enrollment.findUnique({
      where: { courseId_userId: { courseId: quiz.courseId, userId: ctx.session.userId } },
    });
    if (!enrollment || enrollment.status === "requested") throw new TRPCError({ code: "NOT_FOUND", message: "Not found." });

    const [course, allQuestions, attempts] = await Promise.all([
      ctx.rawDb.course.findUnique({ where: { id: quiz.courseId }, select: { title: true } }),
      ctx.rawDb.quizQuestion.findMany({ where: { quizId: input.quizId }, orderBy: { order: "asc" } }),
      ctx.rawDb.quizAttempt.findMany({
        where: { quizId: input.quizId, userId: ctx.session.userId, submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
      }),
    ]);

    const totalPoints = allQuestions.reduce((sum, q) => sum + q.points, 0);
    const questions = allQuestions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: readOptions(q.options),
      points: q.points,
    }));

    const lastAttempt = attempts[0] ?? null;
    const availability = availabilityOf(quiz);
    const scorePercent =
      lastAttempt?.score !== undefined && lastAttempt?.score !== null && totalPoints > 0
        ? Math.round((lastAttempt.score / totalPoints) * 100)
        : undefined;

    return {
      quiz: {
        ...quiz,
        courseTitle: course?.title ?? "Unknown course",
        questionCount: questions.length,
        totalPoints,
        questions,
      },
      lastAttempt,
      attemptsUsed: attempts.length,
      canAttempt: attempts.length < quiz.retakesAllowed + 1 && availability === "open",
      availability,
      passed:
        quiz.kind === "assessment" && scorePercent !== undefined
          ? scorePercent >= (quiz.passingScorePercent ?? 0)
          : undefined,
      scorePercent,
    };
  }),

  submitAttempt: protectedProcedure
    .input(
      z.object({
        quizId: z.string(),
        answers: z.record(z.string(), z.string()),
        /** Set when the time limit ran out — blanks score zero instead of
         * blocking the submit, since the learner no longer has the chance to
         * fill them in. */
        timeExpired: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const quiz = await ctx.rawDb.quiz.findUnique({ where: { id: input.quizId } });
      if (!quiz) throw new TRPCError({ code: "NOT_FOUND", message: "Not found." });

      // Without this, ANY authenticated user could submit an attempt on ANY
      // quiz by id — see `assignments.ts`'s `submit` for the identical
      // reasoning: the old tenant-scoped lookup provided this boundary as a
      // side effect before `Quiz` moved into the platform org; now that the
      // lookup is deliberately unscoped, this has to be explicit.
      const enrollment = await ctx.rawDb.enrollment.findUnique({
        where: { courseId_userId: { courseId: quiz.courseId, userId: ctx.session.userId } },
      });
      if (!enrollment || enrollment.status === "requested") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not enrolled in this course." });
      }

      const isAssessment = quiz.kind === "assessment";
      const noun = isAssessment ? "assessment" : "quiz";

      const questions = await ctx.rawDb.quizQuestion.findMany({ where: { quizId: input.quizId } });
      if (questions.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `This ${noun} has no questions yet.` });
      }

      // Re-checked at submit time, not just at start: an attempt begun a
      // minute before the window closed must not land after it.
      const availability = availabilityOf(quiz);
      if (availability === "not_yet") throw new TRPCError({ code: "FORBIDDEN", message: "This assessment isn't open yet." });
      if (availability === "closed") throw new TRPCError({ code: "FORBIDDEN", message: "This assessment has closed." });

      const used = await ctx.rawDb.quizAttempt.count({
        where: { quizId: input.quizId, userId: ctx.session.userId, submittedAt: { not: null } },
      });
      if (used >= quiz.retakesAllowed + 1) {
        throw new TRPCError({ code: "FORBIDDEN", message: `You've used every attempt on this ${noun}.` });
      }

      const unanswered = questions.filter((q) => !input.answers[q.id]);
      if (unanswered.length > 0 && !input.timeExpired) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Answer every question before submitting — ${unanswered.length} still open.`,
        });
      }

      // Score is computed here, against each question's real `correctOptionId`
      // — never trusted from the client, which submits only chosen option ids.
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      const score = questions.reduce(
        (sum, q) => sum + (input.answers[q.id] === q.correctOptionId ? q.points : 0),
        0,
      );
      const scorePercent = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

      const attempt = await ctx.rawDb.quizAttempt.create({
        data: {
          quizId: input.quizId,
          userId: ctx.session.userId,
          submittedAt: new Date(),
          answers: input.answers,
          score,
        },
      });

      if (!isAssessment) return { attempt, scorePercent };

      const passed = scorePercent >= (quiz.passingScorePercent ?? 0);
      let certificateId: string | undefined;
      if (passed && quiz.certificateTemplateId) {
        const certificate = await issueCertificate(ctx.db, {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          templateId: quiz.certificateTemplateId,
          sourceKind: "assessment",
          sourceId: quiz.id,
          sourceTitle: quiz.title,
        });
        certificateId = certificate.id;
      }
      return { attempt, scorePercent, passed, certificateId };
    }),

  /** Quizzes (or assessments) on courses the learner is actively enrolled in. */
  mine: protectedProcedure
    .input(z.object({ kind: z.enum(["quiz", "assessment"]).default("quiz") }))
    .query(async ({ ctx, input }) => {
      const enrollments = await ctx.rawDb.enrollment.findMany({
        where: { userId: ctx.session.userId, status: { not: "requested" } },
      });
      const courseIds = enrollments.map((e) => e.courseId);
      if (courseIds.length === 0) return [];

      const quizzes = await ctx.rawDb.quiz.findMany({ where: { kind: input.kind, courseId: { in: courseIds } } });
      return Promise.all(quizzes.map((q) => summarize(ctx.rawDb, q)));
    }),
});
