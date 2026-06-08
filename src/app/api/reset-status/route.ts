import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { hrContactId } = await request.json();

    if (!hrContactId) {
      return NextResponse.json(
        { error: 'hrContactId is required' },
        { status: 400 }
      );
    }

    const hrContact = await db.hrContact.findUnique({ where: { id: hrContactId } });
    if (!hrContact) {
      return NextResponse.json(
        { error: 'HR contact not found' },
        { status: 404 }
      );
    }

    await db.hrContact.update({
      where: { id: hrContactId },
      data: {
        status: 'pending',
        subject: null,
        body: null,
        sentAt: null,
        error: null,
        messageId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reset status:', error);
    return NextResponse.json(
      { error: 'Failed to reset status' },
      { status: 500 }
    );
  }
}
