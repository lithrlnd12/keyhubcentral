import * as functions from 'firebase-functions';
import { tenant } from '../config/tenant';
import { sendEmail } from '../utils/email';

// Runtime options
const runtimeOpts: functions.RuntimeOptions = {
  timeoutSeconds: 60,
  memory: '256MB',
  secrets: ['RESEND_API_KEY'],
};

/**
 * Send confirmation email when a new lead is created
 */
export const onLeadCreated = functions
  .runWith(runtimeOpts)
  .firestore.document('leads/{leadId}')
  .onCreate(async (snapshot) => {
    const lead = snapshot.data();

    // Only send if we have an email address
    const email = lead.customer?.email;
    if (!email) {
      console.log('No email address for lead, skipping confirmation email');
      return null;
    }

    // Get contact preference text
    const contactMethod = lead.contactPreference === 'sms' ? 'text message' : 'phone call';
    const customerName = lead.customer?.name ||
      `${lead.customer?.firstName || ''} ${lead.customer?.lastName || ''}`.trim() ||
      'there';

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
          <h1 style="color: ${tenant.colors.primary}; margin: 0; font-size: 28px;">${tenant.entities.kr.label}</h1>
        </div>

        <!-- Content -->
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #333; margin-top: 0;">Thank You for Your Interest!</h2>

          <p>Hi ${customerName},</p>

          <p>Thank you for requesting an initial quote from ${tenant.entities.kr.label}. We're excited to learn more about your project!</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${tenant.colors.primary};">
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
            <strong>The ${tenant.entities.kr.label} Team</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background: ${tenant.colors.background}; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="color: #888; margin: 0; font-size: 14px;">
            ${tenant.entities.kr.label} - Quality Home Improvements
          </p>
          <p style="color: #666; margin: 10px 0 0 0; font-size: 12px;">
            ${tenant.serviceArea}
          </p>
        </div>

      </body>
      </html>
    `;

    try {
      await sendEmail({
        to: email,
        subject: `Thank You for Your Quote Request - ${tenant.entities.kr.label}`,
        html: emailHtml,
        fromName: tenant.entities.kr.label,
      });
      console.log(`Lead confirmation email sent to: ${email}`);
      return null;
    } catch (error) {
      console.error('Error sending lead confirmation email:', error);
      return null;
    }
  });
