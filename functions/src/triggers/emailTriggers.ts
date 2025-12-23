import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

// Runtime options
const runtimeOpts: functions.RuntimeOptions = {
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

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Format date
function formatDate(timestamp: admin.firestore.Timestamp): string {
  return timestamp.toDate().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Get entity display name
function getEntityName(entity: string): string {
  switch (entity) {
    case 'kd': return 'Keynote Digital';
    case 'kts': return 'Key Trade Solutions';
    case 'kr': return 'Key Renovations';
    default: return entity;
  }
}

interface SendInvoiceData {
  invoiceId: string;
  recipientEmail?: string; // Override email if provided
}

/**
 * Send invoice email to recipient
 */
export const sendInvoiceEmail = functions
  .runWith(runtimeOpts)
  .https.onCall(async (data: SendInvoiceData, context: functions.https.CallableContext) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { invoiceId, recipientEmail } = data;

    if (!invoiceId) {
      throw new functions.https.HttpsError('invalid-argument', 'Invoice ID is required');
    }

    const db = admin.firestore();

    // Get invoice
    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Invoice not found');
    }

    const invoice = invoiceDoc.data()!;
    const toEmail = recipientEmail || invoice.to?.email;

    if (!toEmail) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No recipient email address. Please add an email to the invoice.'
      );
    }

    // Generate line items HTML
    const lineItemsHtml = invoice.lineItems
      .map(
        (item: { description: string; qty: number; rate: number; total: number }) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.qty}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.rate)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.total)}</td>
        </tr>
      `
      )
      .join('');

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">

        <!-- Header -->
        <div style="background: #1A1A1A; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #D4A84B; margin: 0; font-size: 28px;">INVOICE</h1>
          <p style="color: #888; margin: 10px 0 0 0;">${invoice.invoiceNumber}</p>
        </div>

        <!-- Invoice Details -->
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none;">

          <!-- From / To -->
          <table style="width: 100%; margin-bottom: 30px;">
            <tr>
              <td style="vertical-align: top; width: 50%;">
                <h3 style="color: #666; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">From</h3>
                <p style="margin: 0; font-weight: bold; font-size: 16px;">${getEntityName(invoice.from.entity)}</p>
                <p style="margin: 5px 0 0 0; color: #666;">${invoice.from.name}</p>
              </td>
              <td style="vertical-align: top; width: 50%;">
                <h3 style="color: #666; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">To</h3>
                <p style="margin: 0; font-weight: bold; font-size: 16px;">${invoice.to.name}</p>
                ${invoice.to.email ? `<p style="margin: 5px 0 0 0; color: #666;">${invoice.to.email}</p>` : ''}
              </td>
            </tr>
          </table>

          <!-- Dates -->
          <table style="width: 100%; margin-bottom: 30px; background: white; border-radius: 8px; padding: 15px;">
            <tr>
              <td style="text-align: center; padding: 10px;">
                <p style="margin: 0; color: #666; font-size: 12px;">Invoice Date</p>
                <p style="margin: 5px 0 0 0; font-weight: bold;">${formatDate(invoice.createdAt)}</p>
              </td>
              <td style="text-align: center; padding: 10px; border-left: 1px solid #eee;">
                <p style="margin: 0; color: #666; font-size: 12px;">Due Date</p>
                <p style="margin: 5px 0 0 0; font-weight: bold; color: #D4A84B;">${formatDate(invoice.dueDate)}</p>
              </td>
              <td style="text-align: center; padding: 10px; border-left: 1px solid #eee;">
                <p style="margin: 0; color: #666; font-size: 12px;">Amount Due</p>
                <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px; color: #1A1A1A;">${formatCurrency(invoice.total)}</p>
              </td>
            </tr>
          </table>

          <!-- Line Items -->
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #1A1A1A;">
                <th style="padding: 12px; text-align: left; color: white;">Description</th>
                <th style="padding: 12px; text-align: center; color: white;">Qty</th>
                <th style="padding: 12px; text-align: right; color: white;">Rate</th>
                <th style="padding: 12px; text-align: right; color: white;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 12px; text-align: right; color: #666;">Subtotal</td>
                <td style="padding: 12px; text-align: right;">${formatCurrency(invoice.subtotal)}</td>
              </tr>
              ${invoice.discount > 0 ? `
              <tr>
                <td colspan="3" style="padding: 12px; text-align: right; color: #666;">Discount</td>
                <td style="padding: 12px; text-align: right; color: #22c55e;">-${formatCurrency(invoice.discount)}</td>
              </tr>
              ` : ''}
              <tr style="background: #1A1A1A;">
                <td colspan="3" style="padding: 15px; text-align: right; color: white; font-weight: bold;">Total Due</td>
                <td style="padding: 15px; text-align: right; color: #D4A84B; font-weight: bold; font-size: 20px;">${formatCurrency(invoice.total)}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Payment Terms -->
          <div style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #666;">Payment Terms: Net 30 Days</p>
            <p style="margin: 10px 0 0 0; color: #888; font-size: 14px;">
              Please include invoice number <strong>${invoice.invoiceNumber}</strong> with your payment.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #1A1A1A; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="color: #888; margin: 0; font-size: 12px;">
            Thank you for your business!
          </p>
          <p style="color: #666; margin: 10px 0 0 0; font-size: 11px;">
            KeyHub Central - Unified Business Management
          </p>
        </div>

      </body>
      </html>
    `;

    // Send email
    const transporter = getTransporter();
    const mailOptions = {
      from: `"${getEntityName(invoice.from.entity)}" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: `Invoice ${invoice.invoiceNumber} from ${getEntityName(invoice.from.entity)}`,
      html: emailHtml,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Invoice ${invoice.invoiceNumber} sent to ${toEmail}`);

      // Update invoice status to sent
      await db.collection('invoices').doc(invoiceId).update({
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        'to.email': toEmail, // Save the email used
      });

      return { success: true, message: `Invoice sent to ${toEmail}` };
    } catch (error) {
      console.error('Error sending invoice email:', error);
      throw new functions.https.HttpsError('internal', 'Failed to send email. Check email configuration.');
    }
  });
