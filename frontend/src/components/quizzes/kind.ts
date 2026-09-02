import type { QuizKind } from "@/types/domain";

/**
 * Assessments and quizzes share every screen — the same records, editor, and
 * attempt flow — so the two differ only in wording and route. Keeping that
 * difference in one table is what stops them drifting into parallel systems.
 */
export interface KindCopy {
  /** "Quiz" / "Assessment" */
  singular: string;
  /** "Quizzes" / "Assessments" */
  plural: string;
  manageBasePath: string;
  learnerBasePath: string;
}

export const KIND_COPY: Record<QuizKind, KindCopy> = {
  quiz: {
    singular: "Quiz",
    plural: "Quizzes",
    manageBasePath: "/manage/quizzes",
    learnerBasePath: "/quizzes",
  },
  assessment: {
    singular: "Assessment",
    plural: "Assessments",
    manageBasePath: "/manage/assessments",
    learnerBasePath: "/assessments",
  },
};
