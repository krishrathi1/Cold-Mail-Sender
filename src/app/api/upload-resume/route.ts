import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate it's a PDF
    if (file.type && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are accepted' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const resumePath = path.join(process.cwd(), 'public', 'resume.pdf');

    await writeFile(resumePath, buffer);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to upload resume:', error);
    return NextResponse.json(
      { error: 'Failed to upload resume' },
      { status: 500 }
    );
  }
}
