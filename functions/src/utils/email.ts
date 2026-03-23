import { Resend } from 'resend';
import { tenant } from '../config/tenant';

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  fromName?: string; // Display name (e.g., "Key Renovations")
  fromEmail?: string; // Override sending address
  replyTo?: string;
}

/**
 * Send an email via Resend.
 * Uses tenant.fromEmail as the default sender.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const resend = getResend();
  const from = `${options.fromName || tenant.appName} <${options.fromEmail || tenant.fromEmail}>`;

  const { error } = await resend.emails.send({
    from,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    ...(options.replyTo && { replyTo: options.replyTo }),
  });

  if (error) {
    console.error('Resend error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
