
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check authentication configuration
    const authSecret = process.env.AUTH_SECRET;

    if (!authSecret) {
      return NextResponse.json(
        { error: "Authentication configuration missing." },
        { status: 500 }
      );
    }

    const secret = new TextEncoder().encode(authSecret);

    // Read login session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("paynext_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    // Verify authentication token
    let userId: unknown;

    try {
      const { payload } = await jwtVerify(token, secret);
      userId = payload.userId;
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    if (typeof userId !== "string") {
      return NextResponse.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    // Verify admin role
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    // Fetch dashboard statistics
    const [
      totalUsers,
      totalTransactions,
      pendingKyc,
      totalFraudAlerts,
      recentTransactions,
      recentAlerts,
      recentLogs,
    ] = await Promise.all([
      prisma.user.count(),

      prisma.transaction.count(),

      prisma.kycApplication.count({
        where: { status: "PENDING" },
      }),

      prisma.fraudAlert.count({
        where: { status: "REVIEW" },
      }),

      prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      }),

      prisma.fraudAlert.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      prisma.securityLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalTransactions,
      pendingKyc,
      totalFraudAlerts,
      recentTransactions,
      recentAlerts,
      recentLogs,
    });

  } catch (error) {
    console.error("Admin overview error:", error);

    return NextResponse.json(
      { error: "Unable to load admin overview data." },
      { status: 500 }
    );
  }
}
