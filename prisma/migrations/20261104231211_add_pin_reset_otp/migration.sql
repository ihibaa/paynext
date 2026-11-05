-- CreateEnum
CREATE TYPE "PinOtpMethod" AS ENUM ('EMAIL', 'PHONE');

-- CreateTable
CREATE TABLE "PinResetOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "PinOtpMethod" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinResetOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PinResetOtp_userId_createdAt_idx" ON "PinResetOtp"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PinResetOtp" ADD CONSTRAINT "PinResetOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
