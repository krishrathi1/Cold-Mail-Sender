import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

function parseEmailJson(text: string): { subject: string; body: string } | null {
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(text);
    if (parsed.subject && parsed.body) return parsed;
  } catch {
    // Not direct JSON, try to extract from markdown code blocks
  }

  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (parsed.subject && parsed.body) return parsed;
    } catch {
      // Code block content is not valid JSON either
    }
  }

  // Try to find any JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*"subject"[\s\S]*"body"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.subject && parsed.body) return parsed;
    } catch {
      // Still not valid JSON
    }
  }

  return null;
}

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

    // Get app config
    const config = await db.appConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      return NextResponse.json(
        { error: 'App config not found. Please configure your profile first.' },
        { status: 400 }
      );
    }

    // Update status to generating
    await db.hrContact.update({
      where: { id: hrContactId },
      data: { status: 'generating' },
    });

    // Parse skills and highlights
    let skills: string[] = [];
    let highlights: string[] = [];
    try {
      skills = JSON.parse(config.candidateSkills);
    } catch { /* ignore */ }
    try {
      highlights = JSON.parse(config.candidateHighlights);
    } catch { /* ignore */ }

    const skillsStr = skills.length > 0 ? skills.join(', ') : 'Not specified';
    const highlightsStr = highlights.length > 0 ? highlights.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'Not specified';

    const systemPrompt = `You are a professional cold email writer. You write concise, personalized cold emails for job seekers reaching out to HR professionals. You must return ONLY a valid JSON object with "subject" and "body" fields. No markdown, no explanation, just the JSON.`;

    const userPrompt = `Write a personalized cold email from a candidate to an HR professional.

CANDIDATE INFO:
- Name: ${config.candidateName}
- Email: ${config.candidateEmail}
- Phone: ${config.candidatePhone}
- LinkedIn: ${config.candidateLinkedin}
- GitHub: ${config.candidateGithub}
- College: ${config.candidateCollege}
- Degree: ${config.candidateDegree}
- Skills: ${skillsStr}
- Key Highlights:
${highlightsStr}

HR RECIPIENT:
- Name: ${hrContact.name}
- Title: ${hrContact.title}
- Company: ${hrContact.company}
- Email: ${hrContact.email}

REQUIREMENTS:
1. Subject line: punchy and professional, reference their company or role
2. First line must personalize to their company — show you researched them
3. Mention 1-2 key achievements from the candidate highlights
4. Keep the body under 120 words
5. End with a polite call-to-action asking for a brief chat
6. Mention that the resume is attached
7. Return ONLY a valid JSON object with "subject" and "body" fields

Return ONLY the JSON object, nothing else.`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const responseText = completion.choices[0]?.message?.content ?? '';
    const emailData = parseEmailJson(responseText);

    if (!emailData) {
      await db.hrContact.update({
        where: { id: hrContactId },
        data: { status: 'pending', error: 'Failed to parse generated email' },
      });
      return NextResponse.json(
        { error: 'Failed to parse generated email', raw: responseText },
        { status: 500 }
      );
    }

    // Update HR contact with generated email
    await db.hrContact.update({
      where: { id: hrContactId },
      data: {
        status: 'generated',
        subject: emailData.subject,
        body: emailData.body,
      },
    });

    return NextResponse.json({
      success: true,
      email: { subject: emailData.subject, body: emailData.body },
    });
  } catch (error) {
    console.error('Failed to generate email:', error);

    // Try to reset the contact status if possible
    try {
      const { hrContactId } = await request.json();
      if (hrContactId) {
        await db.hrContact.update({
          where: { id: hrContactId },
          data: { status: 'pending', error: 'Email generation failed' },
        });
      }
    } catch { /* ignore */ }

    return NextResponse.json(
      { error: 'Failed to generate email' },
      { status: 500 }
    );
  }
}
