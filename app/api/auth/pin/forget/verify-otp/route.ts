
import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { jwtVerify } from "jose";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate logged-in user
    const token = request.cookies.get("paynext_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      throw new Error("AUTH_SECRET is missing.");
    }

    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.userId as string;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Invalid authentication." },
        { status: 401 }
      );
    }

    // 2. Read request data
    const body = await request.json();

    const otp = String(body.otp ?? "").trim();
    const pin = String(body.newPin ?? "").trim();
    const confirmPin = String(body.confirmPin ?? "").trim();

    // 3. Validate OTP
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 6-digit OTP." },
        { status: 400 }
      );
    }

    // 4. Validate new PIN
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        {
          success: false,
          message: "New PIN must contain exactly 6 digits.",
        },
        { status: 400 }
      );
    }

    if (pin !== confirmPin) {
      return NextResponse.json(
        {
          success: false,
          message: "New PIN and confirmation PIN do not match.",
        },
        { status: 400 }
      );
    }

    // 5. Find the logged-in user's active OTP
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        transactionPinHash: true,
      },
    });

    if (!user || !user.transactionPinHash) {
      return NextResponse.json(
        {
          success: false,
          message: "Account or transaction PIN not found.",
        },
        { status: 404 }
      );
    }

    const otpRecord = await prisma.pinResetOtp.findFirst({
      where: {
        userId: user.id,
        method: "EMAIL",
        consumedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          message: "No active OTP found. Please request a new OTP.",
        },
        { status: 400 }
      );
    }

    // 6. Check OTP expiry
    if (otpRecord.expiresAt <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "OTP has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // 7. Check maximum attempts
    if (otpRecord.attempts >= 5) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many incorrect attempts. Please request a new OTP.",
        },
        { status: 429 }
      );
    }

    // 8. Verify OTP
    const isOtpValid = await compare(otp, otpRecord.codeHash);

    if (!isOtpValid) {
      const updated = await prisma.pinResetOtp.updateMany({
        where: {
          id: otpRecord.id,
          attempts: otpRecord.attempts,
          consumedAt: null,
        },
        data: {
          attempts: { increment: 1 },
        },
      });

      if (updated.count !== 1) {
        return NextResponse.json(
          {
            success: false,
            message: "OTP has changed. Please try again.",
          },
          { status: 409 }
        );
      }

      const attemptsUsed = otpRecord.attempts + 1;

      if (attemptsUsed >= 5) {
        await prisma.pinResetOtp.updateMany({
          where: {
            id: otpRecord.id,
            consumedAt: null,
          },
          data: {
            consumedAt: new Date(),
          },
        });
      }

      return NextResponse.json(
        {
          success: false,
          message:
            attemptsUsed >= 5
              ? "Too many incorrect attempts. Please request a new OTP."
              : `Incorrect OTP. ${5 - attemptsUsed} attempts remaining.`,
        },
        { status: attemptsUsed >= 5 ? 429 : 400 }
      );
    }

    // 9. Hash the new transaction PIN
    const newPinHash = await hash(pin, 12);

    // 10. Consume OTP and update PIN atomically
    const resetSuccessful = await prisma.$transaction(async (tx) => {
      const consumed = await tx.pinResetOtp.updateMany({
        where: {
          id: otpRecord.id,
          userId: user.id,
          method: "EMAIL",
          consumedAt: null,
          attempts: { lt: 5 },
          expiresAt: { gt: new Date() },
        },
        data: {
          consumedAt: new Date(),
        },
      });

      if (consumed.count !== 1) {
        return false;
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          transactionPinHash: newPinHash,
          pinFailedAttempts: 0,
          pinLockedUntil: null,
        },
      });

      // Invalidate any other unused reset OTPs
      await tx.pinResetOtp.updateMany({
        where: {
          userId: user.id,
          method: "EMAIL",
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await tx.securityLog.create({
        data: {
          userId: user.id,
          action: "TRANSACTION_PIN_RESET",
          details: "Transaction PIN reset after registered email OTP verification.",
        },
      });

      return true;
    });

    if (!resetSuccessful) {
      return NextResponse.json(
        {
          success: false,
          message: "OTP is no longer valid. Please request a new one.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your transaction PIN has been reset successfully.",
    });
  } catch (error) {
    console.error("PIN reset verification error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to reset PIN. Please try again later.",
      },
      { status: 500 }
    );
  }
}
