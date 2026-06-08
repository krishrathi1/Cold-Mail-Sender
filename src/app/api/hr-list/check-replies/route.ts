import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';

function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, '') // remove soft line breaks
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function cleanEmailBody(text: string): string {
  const lines = text.split(/\r?\n/);
  const cleanedLines: string[] = [];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    // Stop at original email thread markers, quotes, or standard signature cuts
    if (
      line.trim().startsWith('>') || 
      (lowerLine.startsWith('on ') && lowerLine.includes(' wrote:')) ||
      lowerLine.startsWith('from:') ||
      lowerLine.startsWith('to:') ||
      lowerLine.startsWith('-----original message-----') ||
      lowerLine.startsWith('sent from my') // mobile signatures
    ) {
      break;
    }
    cleanedLines.push(line);
  }
  
  return cleanedLines.join('\n').trim();
}

function parseRawEmail(rawSource: string): { subject: string; body: string } {
  // Find double newline separating headers and body
  const parts = rawSource.split(/\r?\n\r?\n/);
  const headersPart = parts[0] || '';
  let bodyPart = parts.slice(1).join('\n') || '';

  // Extract Subject header
  const subjectMatch = headersPart.match(/^Subject:\s*(.*)$/im);
  let subject = subjectMatch ? subjectMatch[1].trim() : 'No Subject';

  // Decode Subject if it is MIME encoded (e.g. =?UTF-8?B?...)
  if (subject.startsWith('=?')) {
    subject = subject.replace(/=\?utf-8\?[B|Q]\?(.*?)\?=/gi, (match, content) => {
      if (match.toLowerCase().includes('?b?')) {
        return Buffer.from(content, 'base64').toString('utf8');
      } else {
        return decodeQuotedPrintable(content);
      }
    });
  }

  // Handle transfer encoding
  const encodingMatch = headersPart.match(/Content-Transfer-Encoding:\s*(\S+)/i);
  const encoding = encodingMatch ? encodingMatch[1].trim().toLowerCase() : '';

  if (encoding === 'base64') {
    bodyPart = Buffer.from(bodyPart.replace(/\s+/g, ''), 'base64').toString('utf8');
  } else if (encoding === 'quoted-printable') {
    bodyPart = decodeQuotedPrintable(bodyPart);
  }

  // If email is multipart, extract the first plain text chunk
  const contentTypeMatch = headersPart.match(/Content-Type:\s*multipart\/[a-z]+/i);
  if (contentTypeMatch) {
    const boundaryMatch = headersPart.match(/boundary="?([^";\n]+)"?/i);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const chunks = bodyPart.split(`--${boundary}`);
      
      for (const chunk of chunks) {
        if (chunk.toLowerCase().includes('content-type: text/plain')) {
          const chunkParts = chunk.split(/\r?\n\r?\n/);
          let text = chunkParts.slice(1).join('\n').trim();
          
          // Check if chunk has its own encoding
          const chunkEncodingMatch = chunk.match(/Content-Transfer-Encoding:\s*(\S+)/i);
          const chunkEncoding = chunkEncodingMatch ? chunkEncodingMatch[1].trim().toLowerCase() : '';
          if (chunkEncoding === 'base64') {
            text = Buffer.from(text.replace(/\s+/g, ''), 'base64').toString('utf8');
          } else if (chunkEncoding === 'quoted-printable') {
            text = decodeQuotedPrintable(text);
          }
          return { subject, body: cleanEmailBody(text) };
        }
      }
    }
  }

  return { subject, body: cleanEmailBody(bodyPart) };
}

export async function GET() {
  try {
    const config = await db.appConfig.findUnique({ where: { id: 'default' } });
    if (!config || !config.emailUser || !config.emailPass) {
      return NextResponse.json(
        { error: 'Email credentials are not configured. Please enter them in settings.' },
        { status: 400 }
      );
    }

    // Get all HR contacts in "sent" status to check for replies
    const sentContacts = await db.hrContact.findMany({
      where: { status: 'sent' }
    });

    if (sentContacts.length === 0) {
      return NextResponse.json({
        success: true,
        checked: 0,
        replied: 0,
        repliedList: [],
        message: 'No active campaigns in "sent" status to audit.'
      });
    }

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: config.emailUser,
        pass: config.emailPass,
      },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    
    let newlyRepliedCount = 0;
    const repliedContactsList: string[] = [];

    try {
      for (const contact of sentContacts) {
        if (!contact.sentAt) continue;

        // Search by sender address
        const searchResults = await client.search({ from: contact.email });
        if (searchResults.length === 0) continue;

        // Get the latest message UID (last item in array)
        const latestUid = searchResults[searchResults.length - 1];
        
        const message = await client.fetchOne(latestUid.toString(), {
          envelope: true,
          source: true
        });

        if (!message) continue;

        // Check if reply date is after original sent date
        const replyDate = new Date(message.envelope.date || message.internalDate);
        const sentDate = new Date(contact.sentAt);

        if (replyDate.getTime() > sentDate.getTime()) {
          const rawSource = message.source.toString('utf8');
          const parsed = parseRawEmail(rawSource);

          // Update database contact record
          await db.hrContact.update({
            where: { id: contact.id },
            data: {
              status: 'replied',
              replySubject: parsed.subject,
              replyBody: parsed.body,
              repliedAt: replyDate,
            }
          });

          newlyRepliedCount++;
          repliedContactsList.push(`${contact.name} (${contact.company})`);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    return NextResponse.json({
      success: true,
      checked: sentContacts.length,
      replied: newlyRepliedCount,
      repliedList: repliedContactsList,
      message: `Audited ${sentContacts.length} sent contacts. Detected ${newlyRepliedCount} new replies.`
    });
  } catch (error: any) {
    console.error('Failed to audit email replies:', error);
    
    // Provide user-friendly messaging for common Gmail IMAP errors
    let userMessage = error.message || 'Failed to check replies';
    if (error.code === 'EAUTH') {
      userMessage = 'Authentication failed. Please verify your Gmail address and verify IMAP is enabled inside Gmail Settings.';
    }
    
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}
