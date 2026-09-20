ALTER TABLE "ScormLaunchToken" ALTER COLUMN "lessonId" DROP NOT NULL;
ALTER TABLE "ScormLaunchToken" ADD COLUMN "assignmentId" TEXT;
ALTER TABLE "ScormLaunchToken" ADD CONSTRAINT "ScormLaunchToken_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ScormLaunchToken_assignmentId_idx" ON "ScormLaunchToken"("assignmentId");
