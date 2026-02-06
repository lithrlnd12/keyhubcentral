import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

// Basic email format validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// This endpoint sends a fixed-template confirmation email to the customer's own address.
// It is intentionally public (called from the lead capture form) but safe because:
// 1. The template is hardcoded (no user-controlled HTML beyond an escaped first name)
// 2. The email is sent TO the address provided (not arbitrary recipients)
// 3. Gmail has its own rate limiting
export async function POST(request: NextRequest) {
  try {
    const { email, customerName, contactPreference } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.log('Email not configured, skipping confirmation email');
      return NextResponse.json({ success: true, skipped: true });
    }

    const contactMethod = contactPreference === 'sms' ? 'text message' : 'phone call';
    const rawFirstName = customerName?.split(' ')[0] || 'there';
    // Escape HTML to prevent injection in email template
    const firstName = rawFirstName
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

        <!-- Header -->
        <div style="background: #1A1A1A; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #D4A84B; margin: 0; font-size: 28px;">Key Renovations</h1>
        </div>

        <!-- Content -->
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #333; margin-top: 0;">Thank You for Your Interest!</h2>

          <p>Hi ${firstName},</p>

          <p>Thank you for requesting an initial quote from Key Renovations. We're excited to learn more about your project!</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D4A84B;">
            <p style="margin: 0;">
              <strong>What's next?</strong><br>
              One of our specialists will reach out to you shortly by <strong>${contactMethod}</strong> to discuss your project and schedule a free consultation.
            </p>
          </div>

          <p>In the meantime, feel free to think about:</p>
          <ul style="color: #555;">
            <li>What areas of your home you'd like to update</li>
            <li>Any inspiration photos or ideas you have</li>
            <li>Your ideal timeline for the project</li>
          </ul>

          <p>We look forward to helping transform your space!</p>

          <p style="margin-top: 30px;">
            Warm regards,<br>
            <strong>The Key Renovations Team</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #1A1A1A; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="color: #888; margin: 0; font-size: 14px;">
            Key Renovations - Quality Home Improvements
          </p>
          <p style="color: #666; margin: 10px 0 0 0; font-size: 12px;">
            Oklahoma City Metro Area
          </p>
        </div>

      </body>
      </html>
    `;

    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Key Renovations" <${GMAIL_USER}>`,
      to: email,
      subject: 'Thank You for Your Quote Request - Key Renovations',
      html: emailHtml,
    });

    console.log(`Lead confirmation email sent to: ${email}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending lead confirmation email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}
