import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getGeminiApiKey(): string | null {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (configData.geminiApiKey) {
        return configData.geminiApiKey;
      }
    }
  } catch (err) {
    console.error('Failed to read config.json:', err);
  }
  return null;
}

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
  let hrContactId: string | undefined;
  try {
    const body = await request.json();
    hrContactId = body.hrContactId;
    const feedback = body.feedback;

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

    let systemPrompt = `You are a professional cold email writer. You write highly personalized cold emails for job seekers reaching out to HR professionals.
Your goal is to write a tailored email for a specific company. You must:
1. Research or infer what the company does, its domain, or a key interest related to the company.
2. Write a clear, professional sentence or phrase showing you know what the company does or expressing genuine interest in their space.
3. Align the candidate's achievements and background directly to the company's work or industry domain.
4. Keep the email concise, natural, and under 120 words.
5. Return ONLY a valid JSON object with "subject" and "body" fields. No markdown outside of the JSON block, no explanation, just the JSON object itself.`;

    let userPrompt = "";

    // Check if we are refining an existing draft
    if (feedback && hrContact.subject && hrContact.body) {
      userPrompt = `You are asked to refine a previously generated email draft based on feedback from the candidate.

ORIGINAL DRAFT:
Subject: ${hrContact.subject}
Body:
${hrContact.body}

CANDIDATE FEEDBACK / REFINEMENT INSTRUCTIONS:
"${feedback}"

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

${hrContact.replyBody ? `RECEIVED HR REPLY (that you are replying to):\n${hrContact.replyBody}\n` : ''}
${config.customInstructions ? `CANDIDATE WRITING PREFERENCES / INSTRUCTIONS:\n${config.customInstructions}\n` : ''}
REQUIREMENTS:
1. Revise the original subject line and email body to incorporate the candidate's feedback.
2. Keep the email professional, polite, and under 120 words.
3. Make sure to maintain the key information but adjust the tone or details as requested by the feedback.
4. Return ONLY a valid JSON object with "subject" and "body" fields.

Return ONLY the JSON object, nothing else.`;
    } else if (hrContact.status === 'replied' && hrContact.replyBody) {
      // Draft follow-up email in response to a reply
      systemPrompt = `You are a professional assistant. You draft follow-up replies to email responses from HR professionals and recruiters.
Your goal is to write a highly professional, context-aware email response. You must:
1. Address the recipient by name.
2. Read the HR representative's reply message and answer any questions they asked or acknowledge their statements professionally.
3. If they asked to coordinate a call or schedule an interview, state that you are available and suggest some standard professional options (or reference candidate availability).
4. Maintain a polite, enthusiastic, yet professional tone.
5. Keep the email concise, natural, and under 100 words.
6. Return ONLY a valid JSON object with "subject" and "body" fields. No markdown outside of the JSON block, no explanation, just the JSON object itself.`;

      userPrompt = `Write a professional follow-up response email to an HR professional.

CANDIDATE INFO (YOU):
- Name: ${config.candidateName}
- Email: ${config.candidateEmail}
- Phone: ${config.candidatePhone}
- LinkedIn: ${config.candidateLinkedin}
- GitHub: ${config.candidateGithub}

HR RECIPIENT:
- Name: ${hrContact.name}
- Title: ${hrContact.title}
- Company: ${hrContact.company}
- Email: ${hrContact.email}

ORIGINAL OUTREACH EMAIL SENT BY YOU:
Subject: ${hrContact.subject}
Body:
${hrContact.body}

RECEIVED REPLY FROM THE HR REPRESENTATIVE:
Subject: ${hrContact.replySubject || 'Re: Outreach'}
Date Received: ${hrContact.repliedAt ? new Date(hrContact.repliedAt).toLocaleDateString() : 'Recent'}
Content:
${hrContact.replyBody}

${config.customInstructions ? `CANDIDATE WRITING PREFERENCES / INSTRUCTIONS:\n${config.customInstructions}\n` : ''}
REQUIREMENTS:
1. Subject line: Write a suitable reply subject (e.g. "Re: " followed by original subject, or continuing the thread).
2. Acknowledge and address the HR representative's specific message (e.g. if they asked for times, suggest availability).
3. Under 100 words.
4. Return ONLY a valid JSON object with "subject" and "body" fields. No other output.`;
    } else {
      userPrompt = `Write a personalized cold email from a candidate to an HR professional.
You must research or infer details about the target company (${hrContact.company}) based on its name and industry, and write a professional line about what they do or a recent trend in their domain.
Then, write something relating the candidate's achievements/skills directly to their business, products, or technology stack.

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

${config.customInstructions ? `CANDIDATE WRITING PREFERENCES / INSTRUCTIONS:\n${config.customInstructions}\n` : ''}
REQUIREMENTS:
1. Subject line: punchy and professional, reference their company or role
2. First line must personalize to their company — show you know what ${hrContact.company} does or express a specific interest in their space. Mention something related to the company's domain or tech stack, and relate the candidate's highlights to it.
3. Mention 1-2 key achievements from the candidate highlights
4. Keep the body under 120 words
5. End with a polite call-to-action asking for a brief chat
6. Mention that the resume is attached
7. Return ONLY a valid JSON object with "subject" and "body" fields

Return ONLY the JSON object, nothing else.`;
    }

    const apiKey = config.geminiApiKey || getGeminiApiKey();
    if (!apiKey) {
      await db.hrContact.update({
        where: { id: hrContactId },
        data: { status: 'pending', error: 'Gemini API key is not configured' },
      });
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add it to your settings or config.json.' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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
      if (hrContactId) {
        await db.hrContact.update({
          where: { id: hrContactId },
          data: { status: 'pending', error: error instanceof Error ? error.message : 'Email generation failed' },
        });
      }
    } catch { /* ignore */ }

    return NextResponse.json(
      { error: 'Failed to generate email' },
      { status: 500 }
    );
  }
}
