import nodemailer from 'nodemailer';

const buildTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: { user, pass },
  });
};

const transporter = buildTransport();
const fromEmail = process.env.FROM_EMAIL || 'AI Mock Interviewer <no-reply@localhost>';

export const sendOtpEmail = async ({ to, otp, purpose, name }) => {
  const label = purpose === 'reset' ? 'password reset' : 'account verification';
  const subject = `Your ${label} code`;
  const text = `Hi${name ? ` ${name}` : ''}, your ${label} code is ${otp}. It expires in 10 minutes.`;

  if (!transporter) {
    console.log(`[OTP:${purpose}] ${to} -> ${otp}`);
    return { mocked: true };
  }

  return transporter.sendMail({
    from: fromEmail,
    to,
    subject,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#16324f">
        <h2 style="margin:0 0 12px">${subject}</h2>
        <p style="margin:0 0 12px">Hi${name ? ` ${name}` : ''},</p>
        <p style="margin:0 0 16px">Use this verification code:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:0.28em;background:#f8f4ec;border:1px solid #d6cbb8;border-radius:12px;padding:16px 20px;display:inline-block">${otp}</div>
        <p style="margin:16px 0 0;color:#6b7280">This code expires in 10 minutes.</p>
      </div>
    `,
  });
};