import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { authenticator } from "otplib";
import QRCode from "qrcode";

import { prisma } from "../../../../lib/prisma";
import { encryptSecret } from "../../../../lib/twoFactor";

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("paynext_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    const authSecret = process.env.AUTH_SECRET;

    if (!authSecret) {
      throw new Error("AUTH_SECRET is missing.");
    }

    let userId: unknown;

    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(authSecret)
      );
      userId = payload.userId;
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid or expired session." },
        { status: 401 }
      );
    }

    if (typeof userId !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid authentication token." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    if ("twoFactorEnabled" in user && user.twoFactorEnabled) {
      return NextResponse.json(
        {
          success: false,
          message: "Two-factor authentication is already enabled.",
        },
        { status: 400 }
      );
    }

    const secret = authenticator.generateSecret();

    const otpauthUrl = authenticator.keyuri(user.email, "PayNext", secret);

    const qrCode = await QRCode.toDataURL(otpauthUrl);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorPendingSecret: encryptSecret(secret),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Scan this QR code with your authenticator app.",
      qrCode,
      manualSecret: secret,
    });
  } catch (error) {
    console.error("2FA setup error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to start 2FA setup." },
      { status: 500 }
    );
  }
}