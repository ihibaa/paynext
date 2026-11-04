
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

// Verify admin authentication
async function getAdminId(): Promise<string | null> {
  try {
    const authSecret = process.env.AUTH_SECRET;

    if (!authSecret) {
      console.error("AUTH_SECRET is missing.");
      return null;
    }

    const secret = new TextEncoder().encode(authSecret);

    const cookieStore = await cookies();
    const token = cookieStore.get("paynext_token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, secret);

    if (typeof payload.userId !== "string") {
      return null;
    }

    const admin = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!admin || admin.role !== "ADMIN") {
      return null;
    }

    return admin.id;
  } catch (error) {
    console.error("Admin authentication error:", error);
    return null;
  }
}

// GET: Fetch all pending KYC applications
export async function GET() {
  try {
    const adminId = await getAdminId();

    if (!adminId) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const applications = await prisma.kycApplication.findMany({
      where: {
        status: "PENDING",
      },
      orderBy: {
        submittedAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      applications,
    });
  } catch (error) {
    console.error("KYC admin GET error:", error);

    return NextResponse.json(
      { error: "Unable to load KYC applications." },
      { status: 500 }
    );
  }
}

// PATCH: Approve or reject a KYC application
export async function PATCH(request: Request) {
  try {
    const adminId = await getAdminId();

    if (!adminId) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    let body: {
      applicationId?: unknown;
      status?: unknown;
      rejectionNote?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request." },
        { status: 400 }
      );
    }

    const { applicationId, status, rejectionNote } = body;

    if (
      typeof applicationId !== "string" ||
      !applicationId.trim() ||
      (status !== "APPROVED" && status !== "REJECTED")
    ) {
      return NextResponse.json(
        { error: "Invalid request data." },
        { status: 400 }
      );
    }

    if (
      rejectionNote !== undefined &&
      rejectionNote !== null &&
      typeof rejectionNote !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid rejection note." },
        { status: 400 }
      );
    }

    const application = await prisma.kycApplication.findUnique({
      where: {
        id: applicationId,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "KYC application not found." },
        { status: 404 }
      );
    }

    if (application.status !== "PENDING") {
      return NextResponse.json(
        { error: "This KYC application has already been reviewed." },
        { status: 409 }
      );
    }

    const updatedApplication = await prisma.kycApplication.updateMany({
      where: {
        id: applicationId,
        status: "PENDING",
      },
      data: {
        status,
        reviewedAt: new Date(),
        rejectionNote:
          status === "REJECTED"
            ? (rejectionNote as string | null)?.trim() || "Application rejected."
            : null,
      },
    });

    if (updatedApplication.count === 0) {
      return NextResponse.json(
        { error: "Application was already reviewed." },
        { status: 409 }
      );
    }

    const result = await prisma.kycApplication.findUnique({
      where: {
        id: applicationId,
      },
      select: {
        id: true,
        status: true,
        reviewedAt: true,
        rejectionNote: true,
        userId: true,
      },
    });

    // Record the admin action
    await prisma.securityLog.create({
      data: {
        userId: application.userId,
        action: `KYC_${status}`,
        details: `KYC application ${applicationId} was ${status.toLowerCase()} by an admin.`,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        status === "APPROVED"
          ? "KYC application approved successfully."
          : "KYC application rejected successfully.",
      application: result,
    });
  } catch (error) {
    console.error("KYC admin PATCH error:", error);

    return NextResponse.json(
      { error: "Unable to update KYC application." },
      { status: 500 }
    );
  }
}
