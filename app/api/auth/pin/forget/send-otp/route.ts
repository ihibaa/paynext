import { NextRequest, NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { hash } from "bcryptjs";
import { Resend } from "resend";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const cnic = String(body.cnic ?? "").replace(/[-\s]/g, "");

    // Validate CNIC
    if (!/^\d{13}$/.test(cnic)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 13-digit CNIC." },
        { status: 400 }
      );
    }

    // Hash CNIC to match the KYC record
    const cnicHash = createHash("sha256")
      .update(cnic)
      .digest("hex");

    // Find approved KYC and its registered user
    const kyc = await prisma.kycApplication.findFirst({
      where: {
        cnicHash,
        status: "APPROVED",
      },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            transactionPinHash: true,
          },
        },
      },
    });

    // Generic response to avoid revealing whether an account exists
    const genericMessage =
      "If your approved account is eligible, an OTP will be sent to its registered email.";

    if (!kyc?.user || !kyc.user.transactionPinHash) {
      return NextResponse.json({
        success: true,
        message: genericMessage,
      });
    }

    const user = kyc.user;

    // Rate limit: maximum 3 OTP requests per hour
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

    // Prevent another OTP request within 60 seconds
    const recentOtp = await prisma.pinResetOtp.findFirst({
      where: {
        userId: user.id,
        method: "EMAIL",
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
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

    // Generate a secure 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();

    // Hash OTP before saving it
    const codeHash = await hash(otp, 10);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP in database
    const savedOtp = await prisma.pinResetOtp.create({
      data: {
        userId: user.id,
        method: "EMAIL",
        codeHash,
        expiresAt,
      },
    });

    // Configure Resend
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      await prisma.pinResetOtp.delete({
        where: { id: savedOtp.id },
      });

      throw new Error("Resend environment variables are missing.");
    }

    const resend = new Resend(apiKey);

    // Send OTP to the registered email only
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

    // Mask email for frontend display
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