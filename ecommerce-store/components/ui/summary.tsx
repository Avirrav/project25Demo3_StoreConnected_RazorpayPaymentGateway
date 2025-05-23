"use client";

import axios from "axios";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Script from 'next/script';

import Button from "@/components/ui/button";
import Currency from "@/components/ui/currency";
import { createCartStore } from "@/hooks/use-cart";
import { toast } from "react-hot-toast";
import { getSessionData } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Summary = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const store = getSessionData();
  const useCart = createCartStore(store.username);
  const items = useCart.getState().getItems();
  const removeAll: () => void = useCart((state: { removeAll: () => void }) => state.removeAll);

  useEffect(() => {
    if (searchParams.get('success')) {
      toast.success('Payment completed.');
      removeAll();
      router.push(`/${store.username}`); // Redirect to store homepage on success
    }

    if (searchParams.get('canceled')) {
      toast.error('Something went wrong.');
      router.push(`/${store.username}/cart`); // Redirect back to cart on failure
    }
  }, [searchParams, removeAll, router, store.username]);

  const totalPrice = items.reduce((total: number, item: { price: string }) => {
    return total + Number(item.price);
  }, 0);

  const onCheckout = async () => {
    try {
      interface CheckoutResponse {
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
      }

      interface CartItem {
        id: string;
        price: string;
      }
      
      const response = await axios.post<CheckoutResponse>(`${store.apiUrl}/checkout`, {
        productIds: items.map((item: CartItem) => item.id)
      });

      const { orderId, amount, currency, keyId } = response.data;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: store.name || "Store",
        description: "Purchase Description",
        order_id: orderId,
        handler: function (response: any) {
          toast.success('Payment successful!');
          removeAll();
          router.push(`/${store.username}?success=true`); // Redirect to store homepage with success parameter
        },
        modal: {
          ondismiss: function() {
            router.push(`/${store.username}/cart?canceled=true`); // Redirect back to cart if modal is dismissed
          }
        },
        prefill: {
          email: "customer@example.com",
        },
        theme: {
          color: "#000000",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Something went wrong with the checkout process.');
      router.push(`/${store.username}/cart?canceled=true`);
    }
  };

  return (
    <>
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js" 
        strategy="lazyOnload"
      />
      <div className="mt-16 rounded-lg bg-gray-50 px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8">
        <h2 className="text-lg font-medium text-gray-900">
          Order summary
        </h2>
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="text-base font-medium text-gray-900">Order total</div>
            <Currency value={totalPrice} />
          </div>
        </div>
        <Button onClick={onCheckout} disabled={items.length === 0} className="w-full mt-6">
          Checkout
        </Button>
      </div>
    </>
  );
}

export default Summary;