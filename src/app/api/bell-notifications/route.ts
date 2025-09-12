import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST - Créer une notification bell
export async function POST(request: NextRequest) {
  try {
    const { order_id, table_id, message, admin_user } = await request.json();

    if (!order_id || !table_id || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('bell_notifications')
      .insert([{
        order_id,
        table_id,
        message,
        admin_user: admin_user || 'Admin',
        read: false
      }])
      .select();

    if (error) {
      console.error('Error creating bell notification:', error);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Error in bell notification API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Récupérer les notifications bell pour une table
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const table_id = searchParams.get('table_id');
    const unread_only = searchParams.get('unread_only') === 'true';

    if (!table_id) {
      return NextResponse.json({ error: 'Missing table_id parameter' }, { status: 400 });
    }

    let query = supabase
      .from('bell_notifications')
      .select('*')
      .eq('table_id', parseInt(table_id))
      .order('created_at', { ascending: false });

    if (unread_only) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bell notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('Error in bell notification GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Marquer les notifications comme lues
export async function PATCH(request: NextRequest) {
  try {
    const { table_id, notification_ids } = await request.json();

    if (!table_id && !notification_ids) {
      return NextResponse.json({ error: 'Either table_id or notification_ids required' }, { status: 400 });
    }

    let query = supabase
      .from('bell_notifications')
      .update({ read: true });

    if (notification_ids && notification_ids.length > 0) {
      query = query.in('id', notification_ids);
    } else if (table_id) {
      query = query.eq('table_id', parseInt(table_id));
    }

    const { error } = await query;

    if (error) {
      console.error('Error marking notifications as read:', error);
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in bell notification PATCH API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}