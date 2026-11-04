import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { randomUUID } from "crypto";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

const providers: Record<string, string[]> = {
  ELECTRICITY: ["K-Electric", "LESCO", "IESCO"],
  GAS: ["Sui Southern Gas (SSGC)", "Sui Northern Gas (SNGPL)"],
  WATER: ["KWSB"],
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("paynext_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

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

    const body = await request.json();

    const { category, provider, consumerNumber, amount } = body;

    if (
      typeof category !== "string" ||
      !providers[category] ||
      typeof provider !== "string" ||
      !providers[category].includes(provider) ||
      typeof consumerNumber !== "string" ||
      !/^[a-zA-Z0-9-]{5,30}$/.test(consumerNumber.trim()) ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 100000
    ) {
      return NextResponse.json(
        { error: "Please enter valid bill details." },
        { status: 400 }
      );
    }

    const cleanConsumerNumber = consumerNumber.trim();

    const payment = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new Error("WALLET_NOT_FOUND");
      }

      const updatedWallet = await tx.wallet.updateMany({
        where: {
          userId,
          balance: { gte: amount },
        },
        data: {
          balance: { decrement: amount },
        },
      });

      if (updatedWallet.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const transaction = await tx.transaction.create({
        data: {
          reference: randomUUID(),
          senderId: userId,
          amount,
          type: "BILL_PAYMENT",
          status: "COMPLETED",
          description: `${category} bill - ${provider} - Ref: ****${cleanConsumerNumber.slice(-4)}`,
        },
      });

      await tx.securityLog.create({
        data: {
          userId,
          action: "BILL_PAYMENT",
          details: `${provider} bill payment of PKR ${amount}`,
        },
      });

      return transaction;
    });

    return NextResponse.json({
      success: true,
      message: "Bill payment successful!",
      transaction: payment,
    });
  } catch (error) {
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

    console.error("Bill payment error:", error);

    return NextResponse.json(
      { error: "Unable to process bill payment." },
      { status: 500 }
    );
  }
}