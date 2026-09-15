-- Remove the Quizzes/Assessments feature entirely (Quiz.kind distinguished
-- them; both go together since they were always one table). Confirmed zero
-- rows across Quiz/QuizQuestion/QuizAttempt and zero Certificate rows with
-- sourceKind = 'assessment' before writing this — a clean drop, no data to
-- migrate.

-- DropForeignKey (CASCADE also drops QuizQuestion_quizId_fkey / QuizAttempt_quizId_fkey / QuizAttempt_userId_fkey / Quiz_certificateTemplateId_fkey with the tables below)
DROP TABLE "QuizQuestion";
DROP TABLE "QuizAttempt";
DROP TABLE "Quiz";

DROP TYPE "QuizKind";
DROP TYPE "QuizQuestionType";

-- CertificateSourceKind loses the 'assessment' value. Postgres has no direct
-- "ALTER TYPE ... DROP VALUE" — recreate the enum without it and repoint the
-- one column that uses it (empty of 'assessment' rows, confirmed above).
ALTER TYPE "CertificateSourceKind" RENAME TO "CertificateSourceKind_old";
CREATE TYPE "CertificateSourceKind" AS ENUM ('course', 'path', 'manual');
ALTER TABLE "Certificate" ALTER COLUMN "sourceKind" TYPE "CertificateSourceKind" USING ("sourceKind"::text::"CertificateSourceKind");
DROP TYPE "CertificateSourceKind_old";

-- Rename Academy -> LearningPlan, and narrow it to grouping LearningPaths
-- only (drop the direct-course join table, AcademyCourse) — confirmed zero
-- AcademyCourse rows and the one existing Academy has an empty pathIds
-- array, so nothing here loses real data either.
DROP TABLE "AcademyCourse";

ALTER TABLE "Academy" RENAME TO "LearningPlan";
ALTER TABLE "LearningPlan" RENAME CONSTRAINT "Academy_pkey" TO "LearningPlan_pkey";
ALTER TABLE "LearningPlan" RENAME CONSTRAINT "Academy_orgId_fkey" TO "LearningPlan_orgId_fkey";
ALTER INDEX "Academy_orgId_idx" RENAME TO "LearningPlan_orgId_idx";
