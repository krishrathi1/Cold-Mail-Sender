import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.hrContact.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'HR contact not found' },
        { status: 404 }
      );
    }

    await db.hrContact.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete HR contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete HR contact' },
      { status: 500 }
    );
  }
}
