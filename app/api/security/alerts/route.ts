import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";


export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("paynext_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      return NextResponse.json(
        { success: false, message: "Authentication configuration missing." },
        { status: 500 }
      );
    }

    const secretKey = new TextEncoder().encode(secret);

    let userId: unknown;

    try {
      const { payload } = await jwtVerify(token, secretKey);
      userId = payload.userId;
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid or expired session." },
        { status: 401 }
      );
    }

    if (typeof userId !== "string" || !userId) {
      return NextResponse.json(
        { success: false, message: "Invalid authentication token." },
        { status: 401 }
      );
    }

    const [alerts, securityLogs] = await Promise.all([
      prisma.fraudAlert.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          transaction: {
            select: {
              reference: true,
              amount: true,
              status: true,
              type: true,
            },
          },
        },
      }),

      prisma.securityLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      success: true,
      alerts: alerts.map((alert) => ({
        id: alert.id,
        riskScore: alert.riskScore,
        reason: alert.reason,
        status: alert.status,
        createdAt: alert.createdAt,
        transaction: alert.transaction
          ? {
              reference: alert.transaction.reference,
              amount: alert.transaction.amount.toString(),
              status: alert.transaction.status,
              type: alert.transaction.type,
            }
          : null,
      })),
      securityLogs,
    });
  } catch (error) {
    console.error("Security alerts error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load security information." },
      { status: 500 }
    );
  }
}