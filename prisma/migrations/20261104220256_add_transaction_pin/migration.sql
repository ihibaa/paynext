-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3),
ADD COLUMN     "transactionPinHash" TEXT;
