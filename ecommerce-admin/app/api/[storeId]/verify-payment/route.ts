import { NextResponse } from "next/server";
import crypto from "crypto";
import prismadb from "@/lib/prismadb";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    console.log('Razorpay Order ID:', razorpay_order_id, 'Razorpay Payment ID:', razorpay_payment_id, 'Razorpay Signature:', razorpay_signature);

    if (!razorpay_signature) {
      return new NextResponse("Webhook signature missing", { status: 400 });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return new NextResponse("Invalid signature", { status: 400 });
    }

    // Update order status
    const order = await prismadb.order.update({
      where: {
      paymentId: razorpay_payment_id,
      },
      data: {
      isPaid: true,
      paymentStatus: 'paid',
      orderStatus: 'confirmed'
      },
      include: {
      orderItems: true,
      },
    });


    return NextResponse.json({ message: "Payment verified successfully" }, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.log('[VERIFY_PAYMENT_ERROR]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}