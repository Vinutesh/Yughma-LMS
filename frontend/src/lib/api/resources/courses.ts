import type { Course, CourseModule, Enrollment, Lesson, LessonContentType } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined, toDateStrings } from "@/lib/api/serialization";

/**
 * Real backend-backed courses resource client. `orgId`/`actorUserId`
 * arguments the mock signatures took are dropped — the backend infers both
 * from the caller's session (see `courses.ts` router). Module/lesson
 * mutations now also take `courseId` alongside the module/lesson id, since
 * the router needs it to verify the parent course belongs to the caller's
 * org before touching either (see `courses.ts` router's doc comment).
 */



export interface CourseSummary extends Course {
  authorName: string;
  moduleCount: number;
  lessonCount: number;
  enrolledCount: number;
  estimatedMinutes: number;
}

/** `skillIds`/`prerequisiteIds` are flat arrays on the mock's `Course` type,
 * modeled as real join tables (`CourseSkill`, `CoursePrerequisite`) on the
 * backend instead — neither comes back on any real response. Skills-on-
 * courses isn't wired up this pass (still mock-only, see `skills.ts`); real
 * prerequisites are the `prerequisites: {id,title}[]` field on `CourseDetail`
 * below, not this flat id list. Defaulting both to `[]` here keeps the
 * shared `Course` type's shape intact for code that still reads them. */
function toCourseSummary(c: Record<string, unknown>): CourseSummary {
  return {
    skillIds: [],
    prerequisiteIds: [],
    ...toDateStrings(nullsToUndefined(c), ["createdAt", "publishedAt"]),
  } as unknown as CourseSummary;
}

export async function listCourses(): Promise<CourseSummary[]> {
  try {
    const courses = await trpcClient.courses.list.query();
    return courses.map(toCourseSummary);
  } catch (err) {
    throw toApiError(err);
  }
}

// There is deliberately no more `listCatalog`/`enroll`/self-service —
// access is a grant a platform admin creates (see `platform.ts`'s resource
// client), never something a learner browses for and requests themselves.

export interface EnrolledCourse extends CourseSummary {
  enrollment: Enrollment;
  progressPercent: number;
}

export async function listMyCourses(): Promise<EnrolledCourse[]> {
  try {
    const courses = await trpcClient.courses.mine.query();
    return courses.map((c) => ({
      ...toCourseSummary(c),
      enrollment: toDateStrings(nullsToUndefined(c.enrollment), ["enrolledAt", "completedAt"]) as unknown as Enrollment,
      progressPercent: c.progressPercent,
    }));
  } catch (err) {
    throw toApiError(err);
  }
}

export interface CourseOutlineModule extends CourseModule {
  lessons: Lesson[];
}

export interface CourseDetail extends CourseSummary {
  outline: CourseOutlineModule[];
  prerequisites: { id: string; title: string }[];
  enrollment: Enrollment | null;
}

/** `learnerContext` is kept as a no-op parameter for existing call sites —
 * the backend now always enforces the draft/invite-only visibility rule
 * server-side (an enrollment or `courses:edit` grants access), rather than
 * trusting a client-supplied flag to opt into the check. See `courses.ts`'s
 * `get` resolver on the backend for why a client-trusted flag was a bug, not
 * a convenience. */
export async function getCourse(courseId: string, _learnerContext = false): Promise<CourseDetail> {
  try {
    const c = await trpcClient.courses.get.query({ courseId });
    return {
      ...toCourseSummary(c),
      outline: c.outline.map((m) => ({ ...nullsToUndefined(m), lessons: m.lessons.map((l) => nullsToUndefined(l)) })) as CourseOutlineModule[],
      prerequisites: c.prerequisites,
      enrollment: c.enrollment
        ? (toDateStrings(nullsToUndefined(c.enrollment), ["enrolledAt", "completedAt"]) as unknown as Enrollment)
        : null,
    };
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createCourse(title: string): Promise<Course> {
  try {
    const c = await trpcClient.courses.create.mutate({ title });
    return toDateStrings(nullsToUndefined(c), ["createdAt", "publishedAt"]) as unknown as Course;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateCourse(
  courseId: string,
  patch: Partial<
    Pick<Course, "title" | "description" | "certificateTemplateId">
  >,
): Promise<void> {
  try {
    await trpcClient.courses.update.mutate({
      courseId,
      ...patch,
      certificateTemplateId: patch.certificateTemplateId === undefined ? undefined : (patch.certificateTemplateId ?? null),
    });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function addPrerequisite(courseId: string, prerequisiteId: string): Promise<void> {
  try {
    await trpcClient.courses.addPrerequisite.mutate({ courseId, prerequisiteId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function removePrerequisite(courseId: string, prerequisiteId: string): Promise<void> {
  try {
    await trpcClient.courses.removePrerequisite.mutate({ courseId, prerequisiteId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function publishCourse(courseId: string): Promise<void> {
  try {
    await trpcClient.courses.publish.mutate({ courseId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function archiveCourse(courseId: string): Promise<void> {
  try {
    await trpcClient.courses.archive.mutate({ courseId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function duplicateCourse(courseId: string): Promise<Course> {
  try {
    const c = await trpcClient.courses.duplicate.mutate({ courseId });
    return toDateStrings(nullsToUndefined(c), ["createdAt", "publishedAt"]) as unknown as Course;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteCourse(courseId: string): Promise<void> {
  try {
    await trpcClient.courses.delete.mutate({ courseId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createModule(courseId: string, title: string): Promise<CourseModule> {
  try {
    return await trpcClient.courses.createModule.mutate({ courseId, title });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function renameModule(courseId: string, moduleId: string, title: string): Promise<void> {
  try {
    await trpcClient.courses.renameModule.mutate({ courseId, moduleId, title });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteModule(courseId: string, moduleId: string): Promise<void> {
  try {
    await trpcClient.courses.deleteModule.mutate({ courseId, moduleId });
  } catch (err) {
    throw toApiError(err);
  }
}

export interface CreateLessonInput {
  courseId: string;
  moduleId: string;
  title: string;
  contentType: LessonContentType;
  body?: string;
  assetId?: string;
  url?: string;
  estimatedMinutes?: number;
}

export async function createLesson(input: CreateLessonInput): Promise<Lesson> {
  try {
    const l = await trpcClient.courses.createLesson.mutate(input);
    return nullsToUndefined(l) as unknown as Lesson;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateLesson(
  courseId: string,
  lessonId: string,
  patch: Partial<Pick<Lesson, "title" | "body" | "assetId" | "url" | "estimatedMinutes">>,
): Promise<void> {
  try {
    await trpcClient.courses.updateLesson.mutate({ courseId, lessonId, ...patch });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteLesson(courseId: string, lessonId: string): Promise<void> {
  try {
    await trpcClient.courses.deleteLesson.mutate({ courseId, lessonId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function moveLesson(courseId: string, lessonId: string, direction: "up" | "down"): Promise<void> {
  try {
    await trpcClient.courses.moveLesson.mutate({ courseId, lessonId, direction });
  } catch (err) {
    throw toApiError(err);
  }
}

export interface LessonCompleteResult {
  courseCompleted: boolean;
  /** Set when finishing the course earned a certificate. */
  certificateId?: string;
}

export async function setLessonComplete(
  enrollmentId: string,
  lessonId: string,
  complete: boolean,
): Promise<LessonCompleteResult> {
  try {
    return await trpcClient.courses.setLessonComplete.mutate({ enrollmentId, lessonId, complete });
  } catch (err) {
    throw toApiError(err);
  }
}

/** Reports how far into a video lesson this learner has actually played —
 * the server-side record `setLessonComplete` checks before allowing a
 * video lesson to complete. Call periodically while playing, not just
 * once; a lower report never erases progress already recorded. */
export async function reportVideoProgress(lessonId: string, currentTime: number, duration: number): Promise<void> {
  try {
    await trpcClient.courses.reportVideoProgress.mutate({ lessonId, currentTime, duration });
  } catch (err) {
    throw toApiError(err);
  }
}

/** The resume point for the video player's seek-blocking — how far this
 * learner has already watched, so reopening a lesson doesn't reset the
 * scrubber boundary back to zero. */
export async function getVideoProgress(lessonId: string): Promise<{ furthestSeconds: number; durationSeconds: number | null }> {
  try {
    return await trpcClient.courses.getVideoProgress.query({ lessonId });
  } catch (err) {
    throw toApiError(err);
  }
}

