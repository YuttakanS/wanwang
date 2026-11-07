import { NextRequest, NextResponse } from 'next/server';
import {
  getParticipants,
  addOrUpdateParticipant,
  deleteParticipant,
  resetParticipants,
  clearAllParticipants,
} from '@/lib/storage';
import { Participant } from '@/types';

export async function GET() {
  try {
    const participants = await getParticipants();
    return NextResponse.json({ success: true, data: participants });
  } catch (error) {
    console.error('API GET Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check special action: reset or clear
    if (body.action === 'reset') {
      const resetList = await resetParticipants();
      return NextResponse.json({ success: true, data: resetList, message: 'Reset to sample data' });
    }
    if (body.action === 'clear') {
      const emptyList = await clearAllParticipants();
      return NextResponse.json({ success: true, data: emptyList, message: 'Cleared all data' });
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อ' }, { status: 400 });
    }

    if (!body.availableDates || !Array.isArray(body.availableDates)) {
      return NextResponse.json({ success: false, error: 'กรุณาเลือกวันที่สะดวก' }, { status: 400 });
    }

    const participant: Participant = {
      id: body.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: body.name.trim(),
      partyRole: body.partyRole || 'สายชิลล์/แช่น้ำเป็ดเหลือง',
      favoriteDrink: body.favoriteDrink ? body.favoriteDrink.trim() : '',
      availableDates: body.availableDates,
      maybeDates: body.maybeDates || [],
      note: body.note ? body.note.trim() : '',
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const updatedList = await addOrUpdateParticipant(participant);
    return NextResponse.json({ success: true, data: updatedList, participant });
  } catch (error) {
    console.error('API POST Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save data' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing participant ID' }, { status: 400 });
    }

    const updatedList = await deleteParticipant(id);
    return NextResponse.json({ success: true, data: updatedList });
  } catch (error) {
    console.error('API DELETE Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
