import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { verifyFirebaseAuth, hasRole } from '@/lib/auth/verifyRequest';
import { getAdminDb } from '@/lib/firebase/admin';
import { tenant } from '@/lib/config/tenant';
import { Timestamp } from 'firebase-admin/firestore';

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

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await verifyFirebaseAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!hasRole(authResult.role, ['owner', 'admin', 'sales_rep'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { contractId, jobId, recipientEmail, recipientName } = await request.json();

    if (!contractId || !jobId || !recipientEmail || !recipientName) {
      return NextResponse.json(
        { error: 'contractId, jobId, recipientEmail, and recipientName are required' },
        { status: 400 }
      );
    }

    // Create signing session in Firestore via admin SDK
    const db = getAdminDb();
    const token = crypto.randomUUID();
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000));

    const sessionRef = db.collection('remoteSigningSessions').doc();
    const session = {
      id: sessionRef.id,
      contractId,
      jobId,
      token,
      recipientEmail,
      recipientName,
      sentBy: authResult.user.uid,
      status: 'pending',
      expiresAt,
      viewedAt: null,
      signedAt: null,
      signatureUrl: null,
      ipAddress: null,
      userAgent: null,
      createdAt: now,
      updatedAt: now,
    };

    await sessionRef.set(session);

    // Build signing URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://keyhubcentral.com';
    const signingUrl = `${appUrl}/sign/${token}`;

    // Send email
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      const escapedName = recipientName
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
          <div style="background: ${tenant.colors.background}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: ${tenant.colors.primary}; margin: 0; font-size: 28px;">${tenant.appName}</h1>
          </div>

          <!-- Content -->
          <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">You've Been Sent a Contract to Sign</h2>

            <p>Hi ${escapedName},</p>

            <p>A contract has been prepared for your review and signature. Please click the button below to view and sign the document electronically.</p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signingUrl}" style="display: inline-block; background: ${tenant.colors.primary}; color: #1A1A1A; padding: 16px 40px; font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px;">
                Sign Contract
              </a>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${tenant.colors.primary};">
              <p style="margin: 0; color: #666;">
                <strong>Important:</strong> This signing link expires in <strong>48 hours</strong>. Please complete your signature before then.
              </p>
            </div>

            <p style="color: #888; font-size: 13px;">
              If the button above doesn't work, copy and paste this link into your browser:<br>
              <a href="${signingUrl}" style="color: ${tenant.colors.primary}; word-break: break-all;">${signingUrl}</a>
            </p>
          </div>

          <!-- Footer -->
          <div style="background: ${tenant.colors.background}; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
            <p style="color: #888; margin: 0; font-size: 14px;">
              ${tenant.appName}
            </p>
            <p style="color: #666; margin: 10px 0 0 0; font-size: 12px;">
              ${tenant.serviceArea}
            </p>
          </div>

        </body>
        </html>
      `;

      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"${tenant.appName}" <${GMAIL_USER}>`,
        to: recipientEmail,
        subject: `Contract Ready for Your Signature - ${tenant.appName}`,
        html: emailHtml,
      });

      console.log(`Remote signing email sent to: ${recipientEmail}`);
    } else {
      console.log('Email not configured, skipping remote signing email');
    }

    return NextResponse.json({
      sessionId: sessionRef.id,
      signingUrl,
    });
  } catch (error) {
    console.error('Error creating remote signing session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create signing session' },
      { status: 500 }
    );
  }
}
