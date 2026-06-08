import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { hrContactId, subject, body } = await request.json();

    if (!hrContactId || !subject || !body) {
      return NextResponse.json(
        { error: 'hrContactId, subject, and body are required' },
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

    const config = await db.appConfig.findUnique({ where: { id: 'default' } });
    if (!config || !config.emailUser || !config.emailPass) {
      return NextResponse.json(
        { error: 'Email credentials not configured. Please set up your Gmail credentials in settings.' },
        { status: 400 }
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.emailUser,
        pass: config.emailPass,
      },
    });

    // Check for resume attachment
    const resumePath = path.join(process.cwd(), 'public', 'resume.pdf');
    const hasResume = existsSync(resumePath);

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${config.candidateName}" <${config.emailUser}>`,
      to: hrContact.email,
      subject,
      text: body,
      attachments: hasResume
        ? [{ filename: 'resume.pdf', path: resumePath }]
        : [],
    };

    try {
      const info = await transporter.sendMail(mailOptions);

      // Update HR contact on success
      await db.hrContact.update({
        where: { id: hrContactId },
        data: {
          status: 'sent',
          subject,
          body,
          sentAt: new Date(),
          messageId: info.messageId,
          error: null,
        },
      });

      return NextResponse.json({
        success: true,
        messageId: info.messageId,
      });
    } catch (sendError: unknown) {
      const errorMessage =
        sendError instanceof Error ? sendError.message : 'Failed to send email';

      // Update HR contact on failure
      await db.hrContact.update({
        where: { id: hrContactId },
        data: {
          status: 'failed',
          subject,
          body,
          error: errorMessage,
        },
      });

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
