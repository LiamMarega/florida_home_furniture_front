import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { contactFormSchema } from '@/lib/validators/contact';

export const dynamic = 'force-dynamic';

const BUSINESS_NAME = 'Florida Home Furniture';
const TO_EMAIL = 'floridahome.fh@gmail.com';
const CC_EMAIL = 'alexis.abramovich@hotmail.com';
const FROM_EMAIL = 'Florida Home Furniture <contact@floridahomefurniture.com>';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildEmailHtml(data: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  message: string;
  transactionalConsent: boolean;
  marketingConsent: boolean;
}): string {
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || '—';
  const messageHtml = data.message
    ? escapeHtml(data.message).replace(/\n/g, '<br/>')
    : '<em style="color:#94a3b8">No message provided</em>';

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#E9E2CF;font-family:Arial,Helvetica,sans-serif;color:#234465;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.10);">
            <tr>
              <td style="background:#234465;padding:24px 28px;color:#ffffff;">
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.75;">New Contact</div>
                <div style="font-size:22px;font-weight:700;margin-top:4px;">${BUSINESS_NAME}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h2 style="margin:0 0 16px;font-size:18px;color:#234465;">Contact details</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.6;">
                  <tr><td style="color:#7493B2;width:120px;">Name</td><td style="font-weight:600;">${escapeHtml(fullName)}</td></tr>
                  <tr><td style="color:#7493B2;">Phone</td><td style="font-weight:600;">${escapeHtml(data.phone)}</td></tr>
                  <tr><td style="color:#7493B2;">Email</td><td style="font-weight:600;"><a href="mailto:${escapeHtml(data.email)}" style="color:#E56A2C;text-decoration:none;">${escapeHtml(data.email)}</a></td></tr>
                </table>
                <h2 style="margin:24px 0 12px;font-size:18px;color:#234465;">Message</h2>
                <div style="background:#E9E2CF;border-radius:12px;padding:16px;font-size:14px;line-height:1.6;color:#234465;">${messageHtml}</div>
                <h2 style="margin:24px 0 12px;font-size:18px;color:#234465;">Consent</h2>
                <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#234465;">
                  <li>Transactional SMS: <strong>${data.transactionalConsent ? 'Yes' : 'No'}</strong></li>
                  <li>Marketing SMS: <strong>${data.marketingConsent ? 'Yes' : 'No'}</strong></li>
                </ul>
              </td>
            </tr>
            <tr>
              <td style="background:#E9E2CF;padding:16px 28px;font-size:12px;color:#234465;">
                Sent from the ${BUSINESS_NAME} contact form.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = contactFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = {
      firstName: parsed.data.firstName?.trim() ?? '',
      lastName: parsed.data.lastName?.trim() ?? '',
      phone: parsed.data.phone.trim(),
      email: parsed.data.email.trim(),
      message: parsed.data.message?.trim() ?? '',
      transactionalConsent: !!parsed.data.transactionalConsent,
      marketingConsent: !!parsed.data.marketingConsent,
    };

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('[contact] RESEND_API_KEY missing');
      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    const subject = `Contacto - ${
      [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email
    }`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      cc: [CC_EMAIL],
      replyTo: data.email,
      subject,
      html: buildEmailHtml(data),
    });

    if (error) {
      console.error('[contact] Resend error:', error);
      return NextResponse.json(
        { error: 'Could not send the message. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[contact] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}
