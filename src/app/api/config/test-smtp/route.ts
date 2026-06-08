import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { emailUser, emailPass } = await request.json();

    if (!emailUser || !emailPass) {
      return NextResponse.json(
        { error: 'Gmail address and App Password are required' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // Verify SMTP connection settings
    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: 'SMTP credentials verified successfully! Connection established.',
    });
  } catch (error: any) {
    console.error('SMTP verification failed:', error);
    
    // Provide user-friendly messaging for common Gmail SMTP errors
    let userMessage = error.message || 'SMTP Connection failed';
    if (error.code === 'EAUTH') {
      userMessage = 'Authentication failed. Please check your Gmail address and verify that you are using a 16-character App Password, not your normal password.';
    } else if (error.command === 'CONN') {
      userMessage = 'Could not establish connection to Gmail SMTP servers. Please check your network connectivity.';
    }
    
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}
