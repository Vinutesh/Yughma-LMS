-- AlterEnum
ALTER TYPE "AssetKind" ADD VALUE 'scorm';

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "scormLaunchPath" TEXT;

-- CreateTable
CREATE TABLE "ScormLaunchToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScormLaunchToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScormLaunchToken_token_key" ON "ScormLaunchToken"("token");

-- CreateIndex
CREATE INDEX "ScormLaunchToken_userId_idx" ON "ScormLaunchToken"("userId");

-- CreateIndex
CREATE INDEX "ScormLaunchToken_lessonId_idx" ON "ScormLaunchToken"("lessonId");

-- AddForeignKey
ALTER TABLE "ScormLaunchToken" ADD CONSTRAINT "ScormLaunchToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScormLaunchToken" ADD CONSTRAINT "ScormLaunchToken_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScormLaunchToken" ADD CONSTRAINT "ScormLaunchToken_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
