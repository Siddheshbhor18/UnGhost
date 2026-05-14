import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

// Mock PhonePe: returns a redirect_url + transactionId.
// In prod, sign and POST to PhonePe's /pg/v1/pay.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = await req.json();
  const transactionId = `MOCK_${Date.now().toString(36)}`;
  return NextResponse.json({
    transactionId,
    bootcampId: body.bootcampId,
    amount: body.amount,
    method: body.method ?? "UPI",
    status: "INITIATED",
    redirectUrl: `/payments/phonepe/pending?txn=${transactionId}&bc=${body.bootcampId}`,
  });
}
