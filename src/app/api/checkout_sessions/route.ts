
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { CartItem, Order } from '@/lib/types';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

// This is the new endpoint for creating Stripe Checkout Sessions
export async function POST(req: NextRequest) {
  try {
    const { cart, tableId, customerName, total } = (await req.json()) as { cart: CartItem[], tableId: string, customerName: string, total: number };

    if (!cart || !tableId) {
      return NextResponse.json({ error: 'Données de panier ou de table manquantes' }, { status: 400 });
    }
    
     const randomOrderNum = Math.floor(Math.random() * 900) + 100;
     const orderShortId = `TABLE-${tableId}-${String(randomOrderNum).padStart(3, '0')}`;

    // 1. Create order in Supabase
     const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer: customerName,
        table_id: parseInt(tableId, 10),
        total,
        status: 'awaiting_payment',
        payment_method: 'Stripe',
        short_id: orderShortId,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order in Supabase:', orderError);
      throw new Error('Could not create order in database');
    }
    const orderId = orderData.id;

    // 2. Create order items
    const orderItems = cart.map(item => ({
      order_id: orderId,
      menu_item_id: item.menuItem.id,
      quantity: item.quantity,
      price: item.menuItem.price,
    }));
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) {
       console.error('Error creating order items in Supabase:', itemsError);
       // Optional: delete the order if items fail? For now, we'll log and continue.
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
      success_url: `${baseUrl}/table/${tableId}?order_success=true&order_id=${orderId}`,
      cancel_url: `${baseUrl}/table/${tableId}?order_canceled=true`,
      metadata: {
        orderId, 
        tableId,
      }
    });
    
    // Associate the Stripe session ID with the Supabase order
    if (session.id) {
       await supabase.from('orders').update({ stripe_session_id: session.id }).eq('id', orderId);
    }

    return NextResponse.json({ sessionId: session.id, orderId });
  } catch (error: any) {
    console.error('Erreur Stripe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
