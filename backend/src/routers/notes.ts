import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc/trpc.js";

/**
 * A learner's own private scratchpad, one per (user, lesson) — see `Note`'s
 * own schema comment. `Lesson`/`Enrollment` are unscoped models, so access
 * is proven the same way `courses.reportVideoProgress` proves it: resolve
 * the lesson, confirm a real (non-`requested`) enrollment in its course,
 * only then touch the row — never trust the client's own claim that it's
 * enrolled.
 */
export const notesRouter = router({
  get: protectedProcedure.input(z.object({ lessonId: z.string() })).query(async ({ ctx, input }) => {
    const note = await ctx.rawDb.note.findUnique({
      where: { userId_lessonId: { userId: ctx.session.userId, lessonId: input.lessonId } },
    });
    return { body: note?.body ?? "" };
  }),

  save: protectedProcedure
    .input(z.object({ lessonId: z.string(), body: z.string().max(20000) }))
    .mutation(async ({ ctx, input }) => {
      const lesson = await ctx.rawDb.lesson.findUnique({ where: { id: input.lessonId } });
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found." });

      const enrollment = await ctx.rawDb.enrollment.findUnique({
        where: { courseId_userId: { courseId: lesson.courseId, userId: ctx.session.userId } },
      });
      if (!enrollment || enrollment.status === "requested") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not enrolled in this course." });
      }

      await ctx.rawDb.note.upsert({
        where: { userId_lessonId: { userId: ctx.session.userId, lessonId: input.lessonId } },
        create: { userId: ctx.session.userId, lessonId: input.lessonId, body: input.body },
        update: { body: input.body },
      });
      return { ok: true };
    }),
});
