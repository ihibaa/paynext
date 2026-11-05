
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { prisma } from "../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required.",
        },
        { status: 400 }
      );
    }

    // Find registered user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { wallet: true },
    });

    // Reject unknown email
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    // Compare entered password with stored hash
    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    // Record failed login attempt
    if (!isPasswordValid) {
      try {
        await prisma.securityLog.create({
          data: {
            userId: user.id,
            action: "FAILED_LOGIN",
            details: "A login attempt failed due to an incorrect password.",
          },
        });
      } catch (logError) {
        console.error("Failed login logging error:", logError);
      }

      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    // Check authentication secret
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      throw new Error("AUTH_SECRET is missing.");
    }

    // Create secure authentication token
    const secretKey = new TextEncoder().encode(secret);

    const token = await new SignJWT({
      userId: user.id,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secretKey);

    // Record successful login
    try {
      await prisma.securityLog.create({
        data: {
          userId: user.id,
          action: "USER_LOGIN",
          details: "User logged in successfully.",
        },
      });
    } catch (logError) {
      console.error("Successful login logging error:", logError);
    }

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful!",
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          wallet: user.wallet
            ? {
                balance: user.wallet.balance.toString(),
                currency: user.wallet.currency,
              }
            : null,
        },
      },
      { status: 200 }
    );

    // Store token in HTTP-only cookie
    response.cookies.set("paynext_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong during login.",
      },
      { status: 500 }
    );
  }
}
