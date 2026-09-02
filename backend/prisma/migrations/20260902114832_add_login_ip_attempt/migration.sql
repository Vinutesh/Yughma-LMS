-- CreateTable
CREATE TABLE "LoginIpAttempt" (
    "ip" TEXT NOT NULL,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "LoginIpAttempt_pkey" PRIMARY KEY ("ip")
);
