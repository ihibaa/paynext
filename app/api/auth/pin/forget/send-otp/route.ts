
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { hash } from "bcryptjs";
import { jwtVerify } from "jose";
import { Resend } from "resend";
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

    // 2. Find the logged-in user's registered email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        transactionPinHash: true,
      },
    });

    if (!user || !user.email || !user.transactionPinHash) {
      return NextResponse.json(
        {
          success: false,
          message: "Account or transaction PIN not found.",
        },
        { status: 404 }
      );
    }

    // 3. Rate limit: maximum 3 requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentOtps = await prisma.pinResetOtp.count({
      where: {
        userId: user.id,
        method: "EMAIL",
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentOtps >= 3) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many OTP requests. Please try again later.",
        },
        { status: 429 }
      );
    }

    // 4. Prevent another request within 60 seconds
    const recentOtp = await prisma.pinResetOtp.findFirst({
      where: {
        userId: user.id,
        method: "EMAIL",
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000),
        },
      },
    });

    if (recentOtp) {
      return NextResponse.json(
        {
          success: false,
          message: "Please wait 60 seconds before requesting another OTP.",
        },
        { status: 429 }
      );
    }

    // 5. Generate and hash a secure 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();
    const codeHash = await hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 6. Invalidate older unused OTPs
    await prisma.pinResetOtp.updateMany({
      where: {
        userId: user.id,
        method: "EMAIL",
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    // 7. Save new OTP
    const savedOtp = await prisma.pinResetOtp.create({
      data: {
        userId: user.id,
        method: "EMAIL",
        codeHash,
        expiresAt,
      },
    });

    // 8. Configure Resend
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      await prisma.pinResetOtp.delete({
        where: { id: savedOtp.id },
      });

      throw new Error("Resend environment variables are missing.");
    }

    const resend = new Resend(apiKey);

    // 9. Send OTP only to the registered email
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: user.email,
      subject: "PayNext - Transaction PIN Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 25px;">
          <h2 style="color: #0f766e;">PayNext Security Verification</h2>
          <p>You requested to reset your PayNext transaction PIN.</p>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing: 8px; color: #0f766e;">
            ${otp}
          </h1>
          <p>This OTP will expire in <strong>10 minutes</strong>.</p>
          <p>If you did not request this code, please ignore this email.</p>
          <p style="color: #64748b;">PayNext Security Team</p>
        </div>
      `,
    });

    if (error) {
      await prisma.pinResetOtp.delete({
        where: { id: savedOtp.id },
      });

      console.error("Resend error:", error);
      throw new Error("Unable to send OTP email.");
    }

    // 10. Mask registered email
    const [emailName, domain] = user.email.split("@");

    const maskedEmail =
      emailName.length <= 2
        ? `${emailName[0]}***@${domain}`
        : `${emailName.slice(0, 2)}***@${domain}`;

    return NextResponse.json({
      success: true,
      message: "OTP sent to your registered email.",
      destination: maskedEmail,
      expiresIn: 600,
    });
  } catch (error) {
    console.error("PIN reset OTP error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to send OTP. Please try again later.",
      },
      { status: 500 }
    );
  }
}
