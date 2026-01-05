"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onLeadCreated = void 0;
const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
// Runtime options
const runtimeOpts = {
    timeoutSeconds: 60,
    memory: '256MB',
    secrets: ['GMAIL_USER', 'GMAIL_APP_PASSWORD'],
};
// Configure email transporter
function getTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
}
/**
 * Send confirmation email when a new lead is created
 */
exports.onLeadCreated = functions
    .runWith(runtimeOpts)
    .firestore.document('leads/{leadId}')
    .onCreate(async (snapshot) => {
    var _a, _b, _c, _d;
    const lead = snapshot.data();
    // Only send if we have an email address
    const email = (_a = lead.customer) === null || _a === void 0 ? void 0 : _a.email;
    if (!email) {
        console.log('No email address for lead, skipping confirmation email');
        return null;
    }
    // Get contact preference text
    const contactMethod = lead.contactPreference === 'sms' ? 'text message' : 'phone call';
    const customerName = ((_b = lead.customer) === null || _b === void 0 ? void 0 : _b.name) ||
        `${((_c = lead.customer) === null || _c === void 0 ? void 0 : _c.firstName) || ''} ${((_d = lead.customer) === null || _d === void 0 ? void 0 : _d.lastName) || ''}`.trim() ||
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
        <div style="background: #1A1A1A; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #D4A84B; margin: 0; font-size: 28px;">Key Renovations</h1>
        </div>

        <!-- Content -->
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #333; margin-top: 0;">Thank You for Your Interest!</h2>

          <p>Hi ${customerName},</p>

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
    const mailOptions = {
        from: '"Key Renovations" <' + process.env.GMAIL_USER + '>',
        to: email,
        subject: 'Thank You for Your Quote Request - Key Renovations',
        html: emailHtml,
    };
    try {
        const transporter = getTransporter();
        await transporter.sendMail(mailOptions);
        console.log(`Lead confirmation email sent to: ${email}`);
        return null;
    }
    catch (error) {
        console.error('Error sending lead confirmation email:', error);
        return null;
    }
});
//# sourceMappingURL=leadEmailTriggers.js.map