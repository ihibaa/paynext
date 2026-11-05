import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { hash } from "bcryptjs";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // 1. Check login authentication
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
    const userId = payload.userId as string;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Invalid authentication." },
        { status: 401 }
      );
    }

    // 3. Read PIN details
    const body = await request.json();

    const pin = String(body.pin ?? "").trim();
    const confirmPin = String(body.confirmPin ?? "").trim();

    // 4. Validate PIN
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction PIN must contain exactly 6 digits.",
        },
        { status: 400 }
      );
    }

    if (pin !== confirmPin) {
      return NextResponse.json(
        {
          success: false,
          message: "PIN and confirmation PIN do not match.",
        },
        { status: 400 }
      );
    }

    // 5. Check user account
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        transactionPinHash: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    // 6. Prevent resetting an already configured PIN
    if (user.transactionPinHash) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction PIN is already configured.",
        },
        { status: 409 }
      );
    }

    // 7. Hash PIN securely
    const pinHash = await hash(pin, 12);

    // 8. Save PIN and security log atomically
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: userId,
          transactionPinHash: null,
        },
        data: {
          transactionPinHash: pinHash,
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
          action: "TRANSACTION_PIN_CREATED",
          details: "User successfully configured a transaction PIN.",
        },
      });

      return true;
    });

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction PIN is already configured.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transaction PIN configured successfully.",
    });
  } catch (error) {
    console.error("PIN setup API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to configure transaction PIN.",
      },
      { status: 500 }
    );
  }
}