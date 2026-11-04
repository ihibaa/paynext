import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { randomUUID } from "crypto";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const cookieStore = await cookies();
    const token = cookieStore.get("paynext_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Please login first." },
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
        { error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    if (typeof userId !== "string" || !userId) {
      return NextResponse.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    // 2. Get top-up details
    const body = await request.json();
    const { mobile, network } = body;
    const amount = Number(body.amount);

    // 3. Validate mobile number
    if (typeof mobile !== "string" || !/^03\d{9}$/.test(mobile)) {
      return NextResponse.json(
        { error: "Invalid Pakistani mobile number." },
        { status: 400 }
      );
    }

    // 4. Validate network
    const allowedNetworks = ["Jazz", "Zong", "Telenor", "Ufone"];

    if (typeof network !== "string" || !allowedNetworks.includes(network)) {
      return NextResponse.json(
        { error: "Invalid mobile network." },
        { status: 400 }
      );
    }

    // 5. Validate amount
    const validAmounts = [100, 200, 300, 500, 1000, 2000];

    if (!validAmounts.includes(amount)) {
      return NextResponse.json(
        { error: "Invalid top-up amount." },
        { status: 400 }
      );
    }

    // 6. Process transaction securely
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new Error("WALLET_NOT_FOUND");
      }

      // Deduct amount only if sufficient balance exists
      const updated = await tx.wallet.updateMany({
        where: {
          userId,
          balance: { gte: amount },
        },
        data: {
          balance: { decrement: amount },
        },
      });

      if (updated.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Save transaction
      const transaction = await tx.transaction.create({
        data: {
          reference: randomUUID(),
          senderId: userId,
          amount,
          type: "MOBILE_TOPUP",
          status: "COMPLETED",
          description: `${network} mobile top-up for ${mobile}`,
        },
      });

      // Save security activity
      await tx.securityLog.create({
        data: {
          userId,
          action: "MOBILE_TOPUP",
          details: `${network} top-up of Rs. ${amount} for ${mobile}`,
        },
      });

      return transaction;
    });

    return NextResponse.json({
      success: true,
      message: "Mobile top-up successful!",
      transactionId: result.reference,
    });
  } catch (error) {
    console.error("Top-up Error:", error);

    if (error instanceof Error) {
      if (error.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          { error: "Insufficient wallet balance." },
          { status: 400 }
        );
      }

      if (error.message === "WALLET_NOT_FOUND") {
        return NextResponse.json(
          { error: "Wallet not found." },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}