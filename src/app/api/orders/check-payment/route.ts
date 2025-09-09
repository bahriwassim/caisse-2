import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Récupérer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('status', 'awaiting_payment')
      .eq('payment_method', 'Stripe')
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found or not awaiting payment' }, { status: 404 });
    }

    if (!order.stripe_payment_intent_id) {
      return NextResponse.json({ error: 'No payment intent found for this order' }, { status: 400 });
    }

    // Vérifier le statut du payment intent auprès de Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);

    let newStatus = 'awaiting_payment';
    
    switch (paymentIntent.status) {
      case 'succeeded':
        newStatus = 'in_preparation';
        break;
      case 'canceled':
      case 'payment_failed':
        newStatus = 'cancelled';
        break;
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
      case 'processing':
        // Après un certain temps en processing, on peut considérer comme échoué
        const created = new Date(paymentIntent.created * 1000);
        const now = new Date();
        const minutesElapsed = (now.getTime() - created.getTime()) / (1000 * 60);
        
        if (minutesElapsed > 15) { // Si plus de 15 minutes en processing
          newStatus = 'cancelled';
        }
        break;
      default:
        // Garder le statut actuel pour les autres cas
        break;
    }

    // Mettre à jour la commande si le statut a changé
    if (newStatus !== 'awaiting_payment') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order status:', updateError);
        return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
      }

      console.log(`✅ Order ${orderId} status updated to ${newStatus} based on payment intent status`);
    }

    return NextResponse.json({ 
      orderId, 
      currentStatus: newStatus,
      paymentIntentStatus: paymentIntent.status 
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}