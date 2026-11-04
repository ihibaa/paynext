import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { createHash } from "crypto";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

async function getAuthenticatedUser(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("paynext_token")?.value;

  if (!token) {
    return null;
  }

  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("Authentication configuration missing.");
  }

  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);

    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    // invalid / expired token
    return null;
  }
}

// Get current KYC status
export async function GET() {
  try {
    const userId = await getAuthenticatedUser();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    const application = await prisma.kycApplication.findUnique({
      where: { userId },
      select: {
        status: true,
        submittedAt: true,
        reviewedAt: true,
        rejectionNote: true,
      },
    });

    return NextResponse.json({
      success: true,
      application,
    });
  } catch (error) {
    console.error("KYC status error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load KYC status." },
      { status: 500 }
    );
  }
}

// Submit KYC application
export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUser();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const cnic = String(body.cnic || "").replace(/-/g, "").trim();

    if (!/^\d{13}$/.test(cnic)) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid 13-digit demo CNIC number.",
        },
        { status: 400 }
      );
    }

    const existingApplication = await prisma.kycApplication.findUnique({
      where: { userId },
    });

    if (existingApplication?.status === "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          message: "Your KYC application is already approved.",
        },
        { status: 400 }
      );
    }

    const cnicHash = createHash("sha256").update(cnic).digest("hex");

    const application = await prisma.kycApplication.upsert({
      where: { userId },
      create: {
        userId,
        cnicHash,
        status: "PENDING",
      },
      update: {
        cnicHash,
        status: "PENDING",
        submittedAt: new Date(),
        reviewedAt: null,
        rejectionNote: null,
      },
      select: {
        status: true,
        submittedAt: true,
      },
    });

    await prisma.securityLog.create({
      data: {
        userId,
        action: "KYC_SUBMITTED",
        details: "A demo KYC application was submitted.",
      },
    });

    return NextResponse.json({
      success: true,
      message: "KYC application submitted successfully.",
      application,
    });
  } catch (error) {
    console.error("KYC submission error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to submit KYC application." },
      { status: 500 }
    );
  }
}