import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { compare, hash } from "bcryptjs";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const cnic = String(body.cnic ?? "").replace(/[-\s]/g, "");
    const otp = String(body.otp ?? "").trim();
    const pin = String(body.newPin ?? "").trim();
    const confirmPin = String(body.confirmPin ?? "").trim();

    // Validate CNIC
    if (!/^\d{13}$/.test(cnic)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 13-digit CNIC." },
        { status: 400 }
      );
    }

    // Validate OTP
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 6-digit OTP." },
        { status: 400 }
      );
    }

    // Validate new PIN
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

    // Verify approved KYC using hashed CNIC
    const cnicHash = createHash("sha256")
      .update(cnic)
      .digest("hex");

    const kyc = await prisma.kycApplication.findFirst({
      where: {
        cnicHash,
        status: "APPROVED",
      },
      select: {
        userId: true,
      },
    });

    if (!kyc) {
      return NextResponse.json(
        {
          success: false,
          message: "Identity verification failed.",
        },
        { status: 400 }
      );
    }

    // Find latest unused email OTP
    const otpRecord = await prisma.pinResetOtp.findFirst({
      where: {
        userId: kyc.userId,
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

    // Check OTP expiry
    const now = new Date();

    if (otpRecord.expiresAt <= now) {
      return NextResponse.json(
        {
          success: false,
          message: "OTP has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // Check maximum attempts
    if (otpRecord.attempts >= 5) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many incorrect attempts. Please request a new OTP.",
        },
        { status: 429 }
      );
    }

    // Compare entered OTP with stored hash
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

      if (updated.count === 1 && otpRecord.attempts + 1 >= 5) {
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
            otpRecord.attempts + 1 >= 5
              ? "Too many incorrect attempts. Please request a new OTP."
              : `Incorrect OTP. ${4 - otpRecord.attempts} attempts remaining.`,
        },
        { status: 400 }
      );
    }

    // Hash the new PIN
    const newPinHash = await hash(pin, 12);

    // Consume OTP and update PIN in one database transaction
    const resetSuccessful = await prisma.$transaction(async (tx) => {
      const consumed = await tx.pinResetOtp.updateMany({
        where: {
          id: otpRecord.id,
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
        where: {
          id: kyc.userId,
        },
        data: {
          transactionPinHash: newPinHash,
          pinFailedAttempts: 0,
          pinLockedUntil: null,
        },
      });

      await tx.securityLog.create({
        data: {
          userId: kyc.userId,
          action: "TRANSACTION_PIN_RESET",
          details: "Transaction PIN successfully reset after email OTP verification.",
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