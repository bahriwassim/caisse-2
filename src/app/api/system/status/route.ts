import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage for demo purposes
// In production, this should be stored in a database
let systemStatus = {
  ordersEnabled: true,
  pausedAt: null as string | null,
  pausedReason: 'Le système de commandes en ligne est temporairement en pause. Notre équipe fait de son mieux pour vous servir dans les meilleures conditions.🍕👨‍🍳',
  paymentMethods: {
    cash: true,
    card: true
  }
};

export async function GET() {
  return NextResponse.json(systemStatus);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, password, paymentMethods } = body;

    // Verify password
    if (password !== '000000') {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
    }

    if (action === 'pause') {
      systemStatus.ordersEnabled = false;
      systemStatus.pausedAt = new Date().toISOString();
    } else if (action === 'activate') {
      systemStatus.ordersEnabled = true;
      systemStatus.pausedAt = null;
    } else if (action === 'updatePaymentMethods') {
      if (paymentMethods) {
        systemStatus.paymentMethods = paymentMethods;
      }
    } else {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    let message = '';
    if (action === 'pause') {
      message = 'Système de commandes mis en pause';
    } else if (action === 'activate') {
      message = 'Système de commandes réactivé avec succès';
    } else if (action === 'updatePaymentMethods') {
      message = 'Méthodes de paiement mises à jour';
    }

    return NextResponse.json({ 
      success: true, 
      status: systemStatus,
      message
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}