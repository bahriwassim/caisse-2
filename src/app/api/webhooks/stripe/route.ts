import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !endpointSecret) {
    return NextResponse.json({ error: 'Missing stripe signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`⚠️  Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.payment_status === 'paid') {
        const orderId = session.metadata?.orderId;
        
        if (orderId) {
          try {
            // Mettre à jour le statut de la commande à "in_preparation"
            const { error } = await supabase
              .from('orders')
              .update({ 
                status: 'in_preparation',
                stripe_payment_intent_id: session.payment_intent as string
              })
              .eq('id', orderId);

            if (error) {
              console.error('Error updating order status:', error);
            } else {
              console.log(`✅ Order ${orderId} marked as paid and in preparation`);
            }
          } catch (error) {
            console.error('Error processing webhook:', error);
          }
        }
      }
      break;
    }
    
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`❌ Payment failed for PaymentIntent ${paymentIntent.id}`);
      
      // Trouver et annuler la commande associée à ce payment intent
      try {
        const { data: orders, error: fetchError } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .eq('status', 'awaiting_payment');

        if (fetchError) {
          console.error('Error fetching orders for failed payment:', fetchError);
        } else if (orders && orders.length > 0) {
          const orderId = orders[0].id;
          
          const { error } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId);

          if (error) {
            console.error('Error cancelling order after payment failure:', error);
          } else {
            console.log(`✅ Order ${orderId} cancelled due to payment failure`);
          }
        }
      } catch (error) {
        console.error('Error processing payment failure:', error);
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      
      if (orderId) {
        try {
          // Annuler la commande si la session de paiement a expiré
          const { error } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId)
            .eq('status', 'awaiting_payment');

          if (error) {
            console.error('Error cancelling expired order:', error);
          } else {
            console.log(`✅ Order ${orderId} cancelled due to expired checkout session`);
          }
        } catch (error) {
          console.error('Error processing expired session:', error);
        }
      }
      break;
    }
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}