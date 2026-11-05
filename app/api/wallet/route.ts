
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
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
        { success: false, message: "Invalid user token." },
        { status: 401 }
      );
    }

    // Get logged-in user's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return NextResponse.json(
        { success: false, message: "Wallet not found." },
        { status: 404 }
      );
    }

    // Get latest 10 transactions for dashboard
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Get ALL incoming transactions for Receive Money history
    const incomingTransactions = await prisma.transaction.findMany({
      where: {
        receiverId: userId,
      },
      include: {
        sender: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,

      wallet: {
        balance: wallet.balance.toString(),
        currency: wallet.currency,
      },

      transactions: transactions.map((transaction) => ({
        ...transaction,
        amount: transaction.amount.toString(),
      })),

      incomingTransactions: incomingTransactions.map((transaction) => ({
        ...transaction,
        amount: transaction.amount.toString(),
      })),
    });

  } catch (error) {
    console.error("Wallet API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load wallet.",
      },
      { status: 500 }
    );
  }
}
