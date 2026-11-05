
import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "../../../lib/prisma";
import { randomUUID } from "node:crypto";

export async function POST(request: NextRequest) {
  try {
    // 1. Check login authentication
    const token = request.cookies.get("paynext_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    // 2. Verify JWT token
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      throw new Error("AUTH_SECRET is missing.");
    }

    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    const senderId = payload.userId as string;

    if (!senderId) {
      return NextResponse.json(
        { success: false, message: "Invalid authentication." },
        { status: 401 }
      );
    }

    // 3. Get transfer details
    const body = await request.json();

    const phone = String(body.phone ?? "").trim();
    const amountInput = String(body.amount ?? "").trim();
    const transactionPin = String(body.transactionPin ?? "").trim();

    // 4. Validate transaction PIN
    if (!/^\d{6}$/.test(transactionPin)) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter your valid 6-digit transaction PIN.",
        },
        { status: 400 }
      );
    }

    // 5. Validate phone number
    if (!/^\+?[0-9]{10,15}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid phone number." },
        { status: 400 }
      );
    }

    // 6. Validate transfer amount
    if (!/^\d+(\.\d{1,2})?$/.test(amountInput)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid amount." },
        { status: 400 }
      );
    }

    const amount = Number(amountInput);

    if (
      !Number.isFinite(amount) ||
      amount < 100 ||
      amount > 100000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Transfer must be between Rs. 100 and Rs. 100,000.",
        },
        { status: 400 }
      );
    }

    // 7. Verify transaction PIN and manage failed attempts
    const pinCheck = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: senderId },
        select: {
          transactionPinHash: true,
          pinFailedAttempts: true,
          pinLockedUntil: true,
        },
      });

      if (!user || !user.transactionPinHash) {
        return {
          success: false,
          status: 400,
          message: "Please set up your transaction PIN first.",
        };
      }

      const now = new Date();
      let failedAttempts = user.pinFailedAttempts;

      // Check active PIN lock
      if (user.pinLockedUntil && user.pinLockedUntil > now) {
        return {
          success: false,
          status: 423,
          code: "PIN_LOCKED",
          message: "Transaction PIN is locked. Try again after 15 minutes.",
        };
      }

      // Reset expired lock
      if (user.pinLockedUntil && user.pinLockedUntil <= now) {
        const reset = await tx.user.updateMany({
          where: {
            id: senderId,
            pinLockedUntil: { lte: now },
          },
          data: {
            pinFailedAttempts: 0,
            pinLockedUntil: null,
          },
        });

        if (reset.count === 0) {
          return {
            success: false,
            status: 409,
            message: "Please retry your transaction.",
          };
        }

        failedAttempts = 0;
      }

      // Compare entered PIN with stored bcrypt hash
      const isPinValid = await compare(
        transactionPin,
        user.transactionPinHash
      );

      if (!isPinValid) {
        const nextAttempts = failedAttempts + 1;

        const lockUntil =
          nextAttempts >= 3
            ? new Date(Date.now() + 15 * 60 * 1000)
            : null;

        // Update failed attempts
        const updated = await tx.user.updateMany({
          where: {
            id: senderId,
            pinFailedAttempts: failedAttempts,
          },
          data: {
            pinFailedAttempts: { increment: 1 },
            ...(lockUntil ? { pinLockedUntil: lockUntil } : {}),
          },
        });

        if (updated.count === 0) {
          return {
            success: false,
            status: 409,
            message: "Please retry your transaction.",
          };
        }

        await tx.securityLog.create({
          data: {
            userId: senderId,
            action: "TRANSACTION_PIN_FAILED",
            details: `Incorrect transaction PIN attempt: ${nextAttempts}`,
          },
        });

        // Lock after 3 incorrect attempts
        if (nextAttempts >= 3) {
          return {
            success: false,
            status: 423,
            code: "PIN_LOCKED",
            message:
              "Too many incorrect PIN attempts. Try again after 15 minutes.",
          };
        }

        // Incorrect PIN response
        return {
          success: false,
          status: 401,
          code: "INVALID_PIN",
          message: `Incorrect PIN. ${3 - nextAttempts} attempts remaining.`,
        };
      }

      // Correct PIN: reset failed attempts
      const resetAttempts = await tx.user.updateMany({
        where: {
          id: senderId,
          pinFailedAttempts: failedAttempts,
        },
        data: {
          pinFailedAttempts: 0,
          pinLockedUntil: null,
        },
      });

      if (resetAttempts.count === 0) {
        return {
          success: false,
          status: 409,
          message: "Please retry your transaction.",
        };
      }

      return { success: true };
    });

    // 8. Return PIN verification errors
    if (!pinCheck.success) {
      return NextResponse.json(
        {
          success: false,
          code: "code" in pinCheck ? pinCheck.code : undefined,
          message: pinCheck.message,
        },
        { status: pinCheck.status }
      );
    }

    // 9. Find receiver account
    const receiver = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        fullName: true,
        phone: true,
      },
    });

    if (!receiver) {
      return NextResponse.json(
        {
          success: false,
          message: "No PayNext account found with this phone number.",
        },
        { status: 404 }
      );
    }

    // 10. Prevent self-transfer
    if (receiver.id === senderId) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot send money to yourself.",
        },
        { status: 400 }
      );
    }

    // 11. Check sender wallet
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId: senderId },
    });

    if (!senderWallet) {
      return NextResponse.json(
        { success: false, message: "Your wallet was not found." },
        { status: 404 }
      );
    }

    // 12. Check receiver wallet
    const receiverWalletExists = await prisma.wallet.findUnique({
      where: { userId: receiver.id },
      select: { id: true },
    });

    if (!receiverWalletExists) {
      return NextResponse.json(
        {
          success: false,
          message: "Receiver wallet was not found.",
        },
        { status: 404 }
      );
    }

    // 13. Generate transaction reference
    const reference = `PN-TRF-${randomUUID()}`;

    // 14. Fraud detection and money transfer
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      const tenMinutesAgo = new Date(
        now.getTime() - 10 * 60 * 1000
      );

      const oneHourAgo = new Date(
        now.getTime() - 60 * 60 * 1000
      );

      // Count transfers in the last 10 minutes
      const recentTransfers = await tx.transaction.count({
        where: {
          senderId,
          type: "TRANSFER",
          status: "COMPLETED",
          createdAt: {
            gte: tenMinutesAgo,
          },
        },
      });

      // Count transfers in the last hour
      const hourlyTransfers = await tx.transaction.count({
        where: {
          senderId,
          type: "TRANSFER",
          status: "COMPLETED",
          createdAt: {
            gte: oneHourAgo,
          },
        },
      });

      // 15. Calculate fraud risk score
      let riskScore = 0;
      const reasons: string[] = [];

      if (amount >= 50000) {
        riskScore += 30;
        reasons.push("Large transaction amount");
      }

      if (recentTransfers >= 3) {
        riskScore += 40;
        reasons.push("Multiple transfers within 10 minutes");
      }

      if (hourlyTransfers >= 5) {
        riskScore += 30;
        reasons.push("Frequent transfers within 1 hour");
      }

      // 16. Determine risk level
      let riskLevel = "LOW";

      if (riskScore >= 70) {
        riskLevel = "HIGH";
      } else if (riskScore >= 40) {
        riskLevel = "MEDIUM";
      }

      // 17. Block high-risk transactions
      if (riskLevel === "HIGH") {
        const blockedTransaction = await tx.transaction.create({
          data: {
            reference,
            senderId,
            receiverId: receiver.id,
            amount: amountInput,
            type: "TRANSFER",
            status: "BLOCKED",
            description: "Blocked due to suspicious activity",
          },
        });

        await tx.fraudAlert.create({
          data: {
            userId: senderId,
            transactionId: blockedTransaction.id,
            riskScore,
            reason: reasons.join(", "),
            status: "BLOCKED",
          },
        });

        await tx.securityLog.create({
          data: {
            userId: senderId,
            action: "FRAUD_TRANSACTION_BLOCKED",
            details: `Transfer of PKR ${amountInput} blocked. Risk score: ${riskScore}. Reasons: ${reasons.join(", ")}`,
          },
        });

        return {
          blocked: true,
          riskScore,
          riskLevel,
          transaction: blockedTransaction,
        };
      }

      // 18. Deduct money from sender wallet
      const deduction = await tx.wallet.updateMany({
        where: {
          userId: senderId,
          balance: {
            gte: amountInput,
          },
        },
        data: {
          balance: {
            decrement: amountInput,
          },
        },
      });

      if (deduction.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // 19. Add money to receiver wallet
      await tx.wallet.update({
        where: {
          userId: receiver.id,
        },
        data: {
          balance: {
            increment: amountInput,
          },
        },
      });

      // 20. Save completed transaction
      const transaction = await tx.transaction.create({
        data: {
          reference,
          senderId,
          receiverId: receiver.id,
          amount: amountInput,
          type: "TRANSFER",
          status: "COMPLETED",
          description: `Money sent to ${receiver.fullName}`,
        },
      });

      // 21. Create medium-risk fraud alert
      if (riskLevel === "MEDIUM") {
        await tx.fraudAlert.create({
          data: {
            userId: senderId,
            transactionId: transaction.id,
            riskScore,
            reason: reasons.join(", "),
            status: "REVIEW",
          },
        });
      }

      // 22. Save security activity log
      await tx.securityLog.create({
        data: {
          userId: senderId,
          action: "MONEY_TRANSFER",
          details: `Transferred PKR ${amountInput} to ${receiver.fullName}. Risk: ${riskLevel}. Score: ${riskScore}. Reference: ${reference}`,
        },
      });

      return {
        blocked: false,
        riskScore,
        riskLevel,
        transaction,
      };
    });

    // 23. Return blocked transaction response
    if (result.blocked) {
      return NextResponse.json(
        {
          success: false,
          blocked: true,
          message: "Transaction blocked due to suspicious activity.",
          riskScore: result.riskScore,
          riskLevel: result.riskLevel,
          reference: result.transaction.reference,
        },
        { status: 403 }
      );
    }

    // 24. Return successful response
    return NextResponse.json({
      success: true,
      message: "Money transferred successfully!",
      receiver: {
        name: receiver.fullName,
        phone: receiver.phone,
      },
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      transaction: {
        id: result.transaction.id,
        reference: result.transaction.reference,
        amount: result.transaction.amount.toString(),
        status: result.transaction.status,
        createdAt: result.transaction.createdAt,
      },
    });

  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INSUFFICIENT_BALANCE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Insufficient wallet balance.",
        },
        { status: 400 }
      );
    }

    console.error("Transfer API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process transfer.",
      },
      { status: 500 }
    );
  }
}
