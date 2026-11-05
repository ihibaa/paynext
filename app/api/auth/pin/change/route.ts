
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { compare, hash } from "bcryptjs";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const token = request.cookies.get("paynext_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    // 2. Verify JWT
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      throw new Error("AUTH_SECRET is missing.");
    }

    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.userId;

    if (typeof userId !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid authentication." },
        { status: 401 }
      );
    }

    // 3. Read PIN details
    const body = await request.json();

    const currentPin = String(body.currentPin ?? "").trim();
    const newPin = String(body.newPin ?? "").trim();
    const confirmPin = String(body.confirmPin ?? "").trim();

    // 4. Validate PINs
    if (
      !/^\d{6}$/.test(currentPin) ||
      !/^\d{6}$/.test(newPin) ||
      !/^\d{6}$/.test(confirmPin)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "All PINs must contain exactly 6 digits.",
        },
        { status: 400 }
      );
    }

    if (newPin !== confirmPin) {
      return NextResponse.json(
        {
          success: false,
          message: "New PIN and confirmation PIN do not match.",
        },
        { status: 400 }
      );
    }

    if (currentPin === newPin) {
      return NextResponse.json(
        {
          success: false,
          message: "New PIN must be different from your current PIN.",
        },
        { status: 400 }
      );
    }

    // 5. Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        transactionPinHash: true,
        pinFailedAttempts: true,
        pinLockedUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    if (!user.transactionPinHash) {
      return NextResponse.json(
        {
          success: false,
          message: "Please set up your Transaction PIN first.",
        },
        { status: 400 }
      );
    }

    // 6. Check temporary PIN lock
    const now = new Date();

    if (user.pinLockedUntil && user.pinLockedUntil > now) {
      return NextResponse.json(
        {
          success: false,
          code: "PIN_LOCKED",
          message: "Too many incorrect attempts. Try again after 15 minutes.",
        },
        { status: 423 }
      );
    }

    // 7. Verify current PIN
    const isCurrentPinValid = await compare(
      currentPin,
      user.transactionPinHash
    );

    if (!isCurrentPinValid) {
      const attempts = user.pinLockedUntil
        ? 0
        : user.pinFailedAttempts;

      const nextAttempts = attempts + 1;
      const shouldLock = nextAttempts >= 3;

      const updated = await prisma.user.updateMany({
        where: {
          id: userId,
          transactionPinHash: user.transactionPinHash,
        },
        data: {
          pinFailedAttempts: nextAttempts,
          pinLockedUntil: shouldLock
            ? new Date(Date.now() + 15 * 60 * 1000)
            : null,
        },
      });

      if (updated.count === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "PIN details changed. Please try again.",
          },
          { status: 409 }
        );
      }

      await prisma.securityLog.create({
        data: {
          userId,
          action: "TRANSACTION_PIN_CHANGE_FAILED",
          details: "Incorrect current PIN entered during PIN change.",
        },
      });

      if (shouldLock) {
        return NextResponse.json(
          {
            success: false,
            code: "PIN_LOCKED",
            message:
              "Three incorrect attempts. PIN changes are locked for 15 minutes.",
          },
          { status: 423 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: "INVALID_PIN",
          message: `Incorrect current PIN. ${3 - nextAttempts} attempts remaining.`,
        },
        { status: 401 }
      );
    }

    // 8. Generate new secure PIN hash
    const newPinHash = await hash(newPin, 12);

    // 9. Update PIN and create security log
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: userId,
          transactionPinHash: user.transactionPinHash,
        },
        data: {
          transactionPinHash: newPinHash,
          pinFailedAttempts: 0,
          pinLockedUntil: null,
        },
      });

      if (updated.count === 0) {
        return false;
      }

      await tx.securityLog.create({
        data: {
          userId,
          action: "TRANSACTION_PIN_CHANGED",
          details: "User successfully changed their transaction PIN.",
        },
      });

      return true;
    });

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "PIN details changed. Please try again.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transaction PIN changed successfully.",
    });
  } catch (error) {
    console.error("PIN change API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to change Transaction PIN.",
      },
      { status: 500 }
    );
  }
}
