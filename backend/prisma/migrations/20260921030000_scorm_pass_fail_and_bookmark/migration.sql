ALTER TABLE "Submission" ADD COLUMN "passed" BOOLEAN;

CREATE TABLE "ScormProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT,
    "assignmentId" TEXT,
    "suspendData" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScormProgress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScormProgress_userId_lessonId_idx" ON "ScormProgress"("userId", "lessonId");
CREATE INDEX "ScormProgress_userId_assignmentId_idx" ON "ScormProgress"("userId", "assignmentId");

ALTER TABLE "ScormProgress" ADD CONSTRAINT "ScormProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScormProgress" ADD CONSTRAINT "ScormProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScormProgress" ADD CONSTRAINT "ScormProgress_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
