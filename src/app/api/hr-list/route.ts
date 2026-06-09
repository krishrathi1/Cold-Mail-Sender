import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const contacts = await db.hrContact.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Failed to get HR contacts:', error);
    return NextResponse.json(
      { error: 'Failed to get HR contacts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, title, company } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const contact = await db.hrContact.create({
      data: {
        name,
        email,
        title: title ?? '',
        company: company ?? '',
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Failed to create HR contact:', error);
    return NextResponse.json(
      { error: 'Failed to create HR contact' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await db.hrContact.deleteMany();
    return NextResponse.json({ success: true, message: 'All contacts deleted successfully' });
  } catch (error) {
    console.error('Failed to delete all HR contacts:', error);
    return NextResponse.json(
      { error: 'Failed to delete all HR contacts' },
      { status: 500 }
    );
  }
}

