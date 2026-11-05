
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("paynext_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login to access your account.",
        },
        { status: 401 }
      );
    }

    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      throw new Error("AUTH_SECRET is missing.");
    }

    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.userId;

    if (typeof userId !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid authentication token.",
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,

        // Used only to check whether a PIN exists.
        // Never send the actual hash to the frontend.
        transactionPinHash: true,

        wallet: {
          select: {
            balance: true,
            currency: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found.",
        },
        { status: 401 }
      );
    }

    const { transactionPinHash, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      message: "Authenticated user found.",
      user: {
        ...safeUser,
        hasTransactionPin: Boolean(transactionPinHash),
        wallet: user.wallet
          ? {
              balance: user.wallet.balance.toString(),
              currency: user.wallet.currency,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Authentication error:", error);

    const response = NextResponse.json(
      {
        success: false,
        message: "Invalid or expired session. Please login again.",
      },
      { status: 401 }
    );

    response.cookies.set("paynext_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  }
}
