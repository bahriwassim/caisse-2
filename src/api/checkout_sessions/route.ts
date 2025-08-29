
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { CartItem } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

// This is the new endpoint for creating Stripe Checkout Sessions
export async function POST(req: NextRequest) {
  try {
    const { cart, tableId, orderId } = (await req.json()) as { cart: CartItem[], tableId: string, orderId: string };

    if (!cart || !tableId || !orderId) {
      return NextResponse.json({ error: 'Données de panier, de table ou de commande manquantes' }, { status: 400 });
    }

    const line_items = cart.map((cartItem) => {
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: cartItem.menuItem.name,
            images: cartItem.menuItem.image ? [cartItem.menuItem.image] : [],
            metadata: {
              menuItemId: cartItem.menuItem.id,
            },
          },
          unit_amount: Math.round(cartItem.menuItem.price * 100), // en centimes
        },
        quantity: cartItem.quantity,
      };
    });
    
    const baseUrl = req.headers.get('origin') || 'http://localhost:3000';

    // The metadata will be used by a webhook to update the order status
    // after a successful payment.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${baseUrl}/table/${tableId}?order_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/table/${tableId}?order_canceled=true`,
      metadata: {
        orderId, // Pass the Firestore Order ID to Stripe
        tableId,
      }
    });
    
    // Associate the Stripe session ID with the Firestore order for reference
    if (session.id) {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { stripeSessionId: session.id });
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Erreur Stripe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
