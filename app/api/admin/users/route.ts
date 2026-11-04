
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";



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

    // Check login session
    const cookieStore = await cookies();
    const token = cookieStore.get("paynext_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    // Verify admin session
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

    // Fetch all registered users
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,

        wallet: {
          select: {
            balance: true,
            currency: true,
          },
        },

        kyc: {
          select: {
            status: true,
            submittedAt: true,
          },
        },

        _count: {
          select: {
            sentTransactions: true,
            receivedTransactions: true,
          },
        },
      },
    });

    return NextResponse.json({
      totalUsers: users.length,
      users,
    });

  } catch (error) {
    console.error("Admin users error:", error);

    return NextResponse.json(
      { error: "Unable to load users." },
      { status: 500 }
    );
  }
}
