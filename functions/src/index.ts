import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

// Admin emails to notify when new users sign up
const ADMIN_EMAILS = [
  'aaron@innovativeaiconsulting.com',
];

// Configure email transporter
// For production, use Gmail OAuth2 or a service like SendGrid/Resend
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
  },
});

// Trigger when a new user document is created in Firestore
export const onUserCreated = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snapshot, context) => {
    const userData = snapshot.data();
    const userId = context.params.userId;

    // Only notify for pending users
    if (userData.status !== 'pending') {
      return null;
    }

    const mailOptions = {
      from: '"KeyHub Central" <noreply@keyhubcentral.com>',
      to: ADMIN_EMAILS.join(', '),
      subject: '🔔 New User Pending Approval - KeyHub Central',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1A1A1A; padding: 20px; text-align: center;">
            <h1 style="color: #D4A84B; margin: 0;">KeyHub Central</h1>
          </div>

          <div style="padding: 30px; background: #f5f5f5;">
            <h2 style="color: #333;">New User Registration</h2>

            <p>A new user has signed up and is awaiting approval:</p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Name:</strong> ${userData.displayName || 'N/A'}</p>
              <p><strong>Email:</strong> ${userData.email}</p>
              <p><strong>Phone:</strong> ${userData.phone || 'N/A'}</p>
              <p><strong>Signed Up:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <p>
              <a href="https://keyhubcentral.vercel.app/admin"
                 style="display: inline-block; background: #D4A84B; color: #1A1A1A; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Review & Approve
              </a>
            </p>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              You can also approve this user directly in the
              <a href="https://console.firebase.google.com/project/key-hub-central/firestore/data/users/${userId}">
                Firebase Console
              </a>.
            </p>
          </div>

          <div style="background: #1A1A1A; padding: 15px; text-align: center;">
            <p style="color: #888; margin: 0; font-size: 12px;">
              KeyHub Central - Unified Business Management
            </p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Notification email sent for new user: ${userData.email}`);
      return null;
    } catch (error) {
      console.error('Error sending notification email:', error);
      return null;
    }
  });

// Trigger when a user is approved (status changes to active)
export const onUserApproved = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if user was just approved
    if (beforeData.status === 'pending' && afterData.status === 'active') {
      const mailOptions = {
        from: '"KeyHub Central" <noreply@keyhubcentral.com>',
        to: afterData.email,
        subject: '✅ Your KeyHub Central Account is Approved!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1A1A1A; padding: 20px; text-align: center;">
              <h1 style="color: #D4A84B; margin: 0;">KeyHub Central</h1>
            </div>

            <div style="padding: 30px; background: #f5f5f5;">
              <h2 style="color: #333;">Welcome to KeyHub Central! 🎉</h2>

              <p>Hi ${afterData.displayName || 'there'},</p>

              <p>Great news! Your account has been approved and you now have access to KeyHub Central.</p>

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Your Role:</strong> ${afterData.role?.replace('_', ' ').toUpperCase()}</p>
              </div>

              <p>
                <a href="https://keyhubcentral.vercel.app/login"
                   style="display: inline-block; background: #D4A84B; color: #1A1A1A; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Sign In Now
                </a>
              </p>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                If you have any questions, please contact your administrator.
              </p>
            </div>

            <div style="background: #1A1A1A; padding: 15px; text-align: center;">
              <p style="color: #888; margin: 0; font-size: 12px;">
                KeyHub Central - Unified Business Management
              </p>
            </div>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Approval email sent to: ${afterData.email}`);
      } catch (error) {
        console.error('Error sending approval email:', error);
      }
    }

    return null;
  });
