import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const { fullName, email, phone, shippingAddress } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!fullName) {
      return new NextResponse("Full name is required", { status: 400 });
    }

    if (!phone) {
      return new NextResponse("Phone is required", { status: 400 });
    }

    if (!email) {
      return new NextResponse("Email is required", { status: 400 });
    }

    if (!shippingAddress) {
      return new NextResponse("Shipping address is required", { status: 400 });
    }

    if (!params.storeId) {
      return new NextResponse("Store id is required", { status: 400 });
    }

    const storeByUserId = await prismadb.store.findFirst({
      where: {
        id: params.storeId,
        userId
      }
    });

    if (!storeByUserId) {
      return new NextResponse("Unauthorized", { status: 405 });
    }

    // Check if customer with same email or phone already exists
    const existingCustomer = await prismadb.customer.findFirst({
      where: {
        OR: [
          { email },
          { phone }
        ],
        storeId: params.storeId
      }
    });

    if (existingCustomer) {
      return new NextResponse("Customer with this email or phone number already exists", { status: 400 });
    }

    const customer = await prismadb.customer.create({
      data: {
        fullName,
        email,
        phone,
        shippingAddress,
        storeId: params.storeId,
      }
    });
  
    return NextResponse.json(customer);
  } catch (error) {
    console.log('[CUSTOMERS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    if (!params.storeId) {
      return new NextResponse("Store id is required", { status: 400 });
    }

    const customers = await prismadb.customer.findMany({
      where: {
        storeId: params.storeId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  
    return NextResponse.json(customers);
  } catch (error) {
    console.log('[CUSTOMERS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}