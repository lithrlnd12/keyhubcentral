import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

// Runtime options
const runtimeOpts: functions.RuntimeOptions = {
  timeoutSeconds: 60,
  memory: '256MB',
  secrets: ['GMAIL_USER', 'GMAIL_APP_PASSWORD'],
};

// HTML entity escaping to prevent injection in email templates
function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Validate URL to prevent javascript: or data: injection in href attributes
function sanitizeUrl(url: string | undefined | null): string {
  if (!url) return '#';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return url;
    }
    return '#';
  } catch {
    return '#';
  }
}

// Internal roles that can send emails
const INTERNAL_ROLES = ['owner', 'admin', 'sales_rep', 'contractor', 'pm'];

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

interface SendContractData {
  contractId: string;
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

    // Verify caller has internal role
    const db = admin.firestore();
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    const callerRole = callerDoc.data()?.role;
    if (!callerRole || !INTERNAL_ROLES.includes(callerRole)) {
      throw new functions.https.HttpsError('permission-denied', 'Only internal users can send invoices');
    }

    const { invoiceId, recipientEmail } = data;

    if (!invoiceId) {
      throw new functions.https.HttpsError('invalid-argument', 'Invoice ID is required');
    }

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

    // Generate line items HTML (escape user-controlled descriptions)
    const lineItemsHtml = invoice.lineItems
      .map(
        (item: { description: string; qty: number; rate: number; total: number }) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${escapeHtml(item.description)}</td>
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
          <p style="color: #888; margin: 10px 0 0 0;">${escapeHtml(invoice.invoiceNumber)}</p>
        </div>

        <!-- Invoice Details -->
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none;">

          <!-- From / To -->
          <table style="width: 100%; margin-bottom: 30px;">
            <tr>
              <td style="vertical-align: top; width: 50%;">
                <h3 style="color: #666; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">From</h3>
                <p style="margin: 0; font-weight: bold; font-size: 16px;">${escapeHtml(getEntityName(invoice.from.entity))}</p>
                <p style="margin: 5px 0 0 0; color: #666;">${escapeHtml(invoice.from.name)}</p>
              </td>
              <td style="vertical-align: top; width: 50%;">
                <h3 style="color: #666; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">To</h3>
                <p style="margin: 0; font-weight: bold; font-size: 16px;">${escapeHtml(invoice.to.name)}</p>
                ${invoice.to.email ? `<p style="margin: 5px 0 0 0; color: #666;">${escapeHtml(invoice.to.email)}</p>` : ''}
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
              Please include invoice number <strong>${escapeHtml(invoice.invoiceNumber)}</strong> with your payment.
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

// Contract type labels
function getContractTypeLabel(documentType: string): string {
  switch (documentType) {
    case 'remodeling_agreement':
      return 'Custom Remodeling Agreement';
    case 'disclosure_statement':
      return 'Disclosure Statement';
    default:
      return documentType;
  }
}

/**
 * Send signed contract email to customer
 */
export const sendContractEmail = functions
  .runWith(runtimeOpts)
  .https.onCall(async (data: SendContractData, context: functions.https.CallableContext) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    // Verify caller has internal role
    const db = admin.firestore();
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    const callerRole = callerDoc.data()?.role;
    if (!callerRole || !INTERNAL_ROLES.includes(callerRole)) {
      throw new functions.https.HttpsError('permission-denied', 'Only internal users can send contracts');
    }

    const { contractId, recipientEmail } = data;

    if (!contractId) {
      throw new functions.https.HttpsError('invalid-argument', 'Contract ID is required');
    }

    // Get contract
    const contractDoc = await db.collection('contracts').doc(contractId).get();
    if (!contractDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Contract not found');
    }

    const contract = contractDoc.data()!;
    const toEmail = recipientEmail || contract.formData?.email;

    if (!toEmail) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No recipient email address. Please add an email to the contract.'
      );
    }

    // Get job info for context
    const jobDoc = await db.collection('jobs').doc(contract.jobId).get();
    const job = jobDoc.exists ? jobDoc.data() : null;
    const jobNumber = job?.jobNumber || 'N/A';

    const documentTypeLabel = getContractTypeLabel(contract.documentType);
    const customerName = contract.formData?.buyerName || 'Customer';
    const signedDate = contract.createdAt?.toDate()?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) || 'Unknown date';

    // Build email HTML
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
          <h1 style="color: #D4A84B; margin: 0; font-size: 24px;">Key Renovations</h1>
          <p style="color: #888; margin: 10px 0 0 0;">Signed Contract</p>
        </div>

        <!-- Content -->
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none;">

          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${escapeHtml(customerName)},</p>

          <p style="margin-bottom: 20px;">
            Thank you for choosing Key Renovations for your home improvement project.
            Please find attached your signed <strong>${escapeHtml(documentTypeLabel)}</strong>.
          </p>

          <!-- Contract Details Box -->
          <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid #eee;">
            <h3 style="margin: 0 0 15px 0; color: #1A1A1A; font-size: 16px;">Contract Details</h3>
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Document Type:</td>
                <td style="padding: 8px 0; font-weight: bold;">${escapeHtml(documentTypeLabel)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Job Number:</td>
                <td style="padding: 8px 0; font-weight: bold;">${escapeHtml(jobNumber)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Signed Date:</td>
                <td style="padding: 8px 0; font-weight: bold;">${escapeHtml(signedDate)}</td>
              </tr>
              ${contract.formData?.purchasePrice ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Contract Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #D4A84B;">${formatCurrency(contract.formData.purchasePrice)}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- View Contract Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${sanitizeUrl(contract.pdfUrl)}"
               style="display: inline-block; background: #D4A84B; color: #1A1A1A; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              View Signed Contract
            </a>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Please keep this email for your records. If you have any questions about your contract or project,
            don't hesitate to reach out to us.
          </p>

          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>Key Renovations Team</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #1A1A1A; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="color: #D4A84B; margin: 0; font-size: 14px; font-weight: bold;">
            Key Renovations
          </p>
          <p style="color: #888; margin: 10px 0 0 0; font-size: 12px;">
            Professional Home Remodeling Services
          </p>
          <p style="color: #666; margin: 10px 0 0 0; font-size: 11px;">
            This is an automated message. Please do not reply directly to this email.
          </p>
        </div>

      </body>
      </html>
    `;

    // Send email
    const transporter = getTransporter();
    const mailOptions = {
      from: `"Key Renovations" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: `Your Signed ${documentTypeLabel} - Job #${jobNumber}`,
      html: emailHtml,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Contract ${contractId} sent to ${toEmail}`);

      // Update contract with email sent info
      await db.collection('contracts').doc(contractId).update({
        emailedTo: toEmail,
        emailedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: `Contract sent to ${toEmail}` };
    } catch (error) {
      console.error('Error sending contract email:', error);
      throw new functions.https.HttpsError('internal', 'Failed to send email. Check email configuration.');
    }
  });
