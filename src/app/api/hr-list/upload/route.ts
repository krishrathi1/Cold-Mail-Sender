import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import Papa from 'papaparse';

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

    const csvText = await file.text();
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase(),
    });

    if (result.errors.length > 0) {
      console.warn('CSV parse warnings:', result.errors);
    }

    const rows = result.data as Record<string, string>[];
    let added = 0;

    for (const row of rows) {
      const name = (row['name'] ?? '').trim();
      const email = (row['email'] ?? '').trim();
      const title = (row['title'] ?? '').trim();
      const company = (row['company'] ?? '').trim();

      if (!name || !email) continue;

      // Skip if email already exists
      const existing = await db.hrContact.findFirst({ where: { email } });
      if (existing) continue;

      await db.hrContact.create({
        data: { name, email, title, company },
      });
      added++;
    }

    return NextResponse.json({ added, total: rows.length });
  } catch (error) {
    console.error('Failed to upload CSV:', error);
    return NextResponse.json(
      { error: 'Failed to upload CSV' },
      { status: 500 }
    );
  }
}
