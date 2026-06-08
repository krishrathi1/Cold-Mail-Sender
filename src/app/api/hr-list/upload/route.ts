import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

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

    const fileName = file.name || '';
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') ||
                    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.type === 'application/vnd.ms-excel';

    let rows: Record<string, string>[] = [];

    if (isExcel) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return NextResponse.json(
          { error: 'Excel file is empty' },
          { status: 400 }
        );
      }
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

      // Normalize keys to lowercase and trim
      rows = rawRows.map((rawRow) => {
        const row: Record<string, string> = {};
        for (const [key, val] of Object.entries(rawRow)) {
          const normalizedKey = key.trim().toLowerCase();
          row[normalizedKey] = String(val ?? '').trim();
        }
        return row;
      });
    } else {
      const csvText = await file.text();
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim().toLowerCase(),
      });

      if (result.errors.length > 0) {
        console.warn('CSV parse warnings:', result.errors);
      }
      rows = result.data as Record<string, string>[];
    }

    let added = 0;

    for (const row of rows) {
      const name = (row['name'] || row['full name'] || '').trim();
      const email = (row['email'] || row['email address'] || '').trim();
      const title = (row['title'] || row['role'] || '').trim();
      const company = (row['company'] || row['organization'] || '').trim();

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
    console.error('Failed to upload and parse file:', error);
    return NextResponse.json(
      { error: 'Failed to upload and parse file' },
      { status: 500 }
    );
  }
}
