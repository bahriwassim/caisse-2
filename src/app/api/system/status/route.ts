import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage for demo purposes
// In production, this should be stored in a database
let systemStatus = {
  ordersEnabled: true,
  pausedAt: null as string | null,
  pausedReason: 'Le système de commandes en ligne est temporairement en pause en raison d\'une forte affluence. Nos chefs préparent avec amour toutes vos commandes ! 🍕👨‍🍳'
};

export async function GET() {
  return NextResponse.json(systemStatus);
}

export async function POST(req: NextRequest) {
  try {
    const { action, password } = await req.json();

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
    } else {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      status: systemStatus,
      message: systemStatus.ordersEnabled 
        ? 'Système de commandes réactivé avec succès' 
        : 'Système de commandes mis en pause'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}