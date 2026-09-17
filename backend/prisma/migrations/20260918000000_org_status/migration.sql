-- Organization archiving (platform-admin "remove a company" — implemented
-- as reversible archive, not a hard delete, to avoid destroying real
-- historical learner data: enrollments, certificates, submissions).
CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'archived');

ALTER TABLE "Organization" ADD COLUMN "status" "OrganizationStatus" NOT NULL DEFAULT 'active';
