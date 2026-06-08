import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    let config = await db.appConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await db.appConfig.create({ data: { id: 'default' } });
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to get config:', error);
    return NextResponse.json(
      { error: 'Failed to get config' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const config = await db.appConfig.upsert({
      where: { id: 'default' },
      update: {
        emailUser: body.emailUser ?? undefined,
        emailPass: body.emailPass ?? undefined,
        geminiApiKey: body.geminiApiKey ?? undefined,
        candidateName: body.candidateName ?? undefined,
        candidateEmail: body.candidateEmail ?? undefined,
        candidatePhone: body.candidatePhone ?? undefined,
        candidateLinkedin: body.candidateLinkedin ?? undefined,
        candidateGithub: body.candidateGithub ?? undefined,
        candidateCollege: body.candidateCollege ?? undefined,
        candidateDegree: body.candidateDegree ?? undefined,
        candidateSkills: body.candidateSkills ?? undefined,
        candidateHighlights: body.candidateHighlights ?? undefined,
        customInstructions: body.customInstructions ?? undefined,
      },
      create: {
        id: 'default',
        emailUser: body.emailUser ?? '',
        emailPass: body.emailPass ?? '',
        geminiApiKey: body.geminiApiKey ?? '',
        candidateName: body.candidateName ?? '',
        candidateEmail: body.candidateEmail ?? '',
        candidatePhone: body.candidatePhone ?? '',
        candidateLinkedin: body.candidateLinkedin ?? '',
        candidateGithub: body.candidateGithub ?? '',
        candidateCollege: body.candidateCollege ?? '',
        candidateDegree: body.candidateDegree ?? '',
        candidateSkills: body.candidateSkills ?? '[]',
        candidateHighlights: body.candidateHighlights ?? '[]',
        customInstructions: body.customInstructions ?? '',
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to update config:', error);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}
