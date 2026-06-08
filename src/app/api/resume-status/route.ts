import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const resumePath = path.join(process.cwd(), 'public', 'resume.pdf');
    const exists = existsSync(resumePath);

    return NextResponse.json({
      exists,
      filename: exists ? 'resume.pdf' : '',
    });
  } catch (error) {
    console.error('Failed to check resume status:', error);
    return NextResponse.json(
      { error: 'Failed to check resume status' },
      { status: 500 }
    );
  }
}
