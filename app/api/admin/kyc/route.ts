import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

async function getAdminId() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("paynext_token")?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, secret);

    if (typeof payload.userId !== "string") return null;

    const admin = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== "ADMIN") return null;

    return admin.id;
  } catch {
    // invalid / expired token
    return null;
  }
}

// Get all pending KYC applications
export async function GET() {
  try {
    const adminId = await getAdminId();

    if (!adminId) {
      return json({ error: "Admin access required." }, { status: 403 });
    }

    const applications = await prisma.kycApplication.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "desc" },
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

    return json({ applications });
  } catch (error) {
    console.error("KYC admin GET error:", error);

    return json(
      { error: "Unable to load KYC applications." },
      { status: 500 }
    );
  }
}

// Approve or reject a KYC application
export async function PATCH(request: Request) {
  try {
    const adminId = await getAdminId();

    if (!adminId) {
      return json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await request.json();
    const { applicationId, status, rejectionNote } = body;

    if (
      typeof applicationId !== "string" ||
      !["APPROVED", "REJECTED"].includes(status)
    ) {
      return json({ error: