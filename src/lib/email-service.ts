/**
 * Email Service — src/lib/email-service.ts
 *
 * Strategy:
 *  1. If SMTP_HOST env var is set → use real SMTP credentials from env.
 *  2. If SMTP_HOST is absent     → auto-create a FREE Ethereal test account
 *     and log the preview URL so you can view the email in a browser.
 *
 * To switch to real SMTP later:
 *   Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM in .env.local
 *   and restart the dev server. No code changes needed.
 */

import nodemailer, { type Transporter } from 'nodemailer';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface EmailComplaintPayload {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  priority: string;
  department: string;
  createdAt: string;
}

// ── Transporter singleton ─────────────────────────────────────────────────────
let _transporter: Transporter | null = null;
let _fromAddress = '"RSCOE Grievance Portal" <noreply@rscoe.example>';
let _etherealPreviewBase = '';

async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  if (process.env.SMTP_HOST) {
    // Real SMTP mode
    _fromAddress = process.env.EMAIL_FROM || '"RSCOE Portal" <noreply@jspm.edu.in>';
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('[EMAIL] Using real SMTP:', process.env.SMTP_HOST);
  } else {
    // Ethereal fake SMTP mode
    try {
      const testAccount = await nodemailer.createTestAccount();
      _fromAddress = `"RSCOE Grievance Portal" <${testAccount.user}>`;
      _etherealPreviewBase = 'https://ethereal.email/message/';
      _transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      console.log('[EMAIL] Ethereal test account created:', testAccount.user);
      console.log('[EMAIL] View sent emails at: https://ethereal.email');
    } catch (err) {
      // Offline fallback — log-only mode
      console.warn('[EMAIL] Ethereal creation failed (offline?). Switching to console-log mode.');
      _transporter = null as unknown as Transporter;
    }
  }

  return _transporter!;
}

// ── Send helper ───────────────────────────────────────────────────────────────
async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  let transporter: Transporter;
  try {
    transporter = await getTransporter();
  } catch {
    // No transporter — fallback log
    _logFallback(opts);
    return;
  }

  if (!transporter) {
    _logFallback(opts);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: _fromAddress,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[EMAIL SENT]');
    console.log('  To      :', opts.to);
    console.log('  Subject :', opts.subject);
    console.log('  Message :', info.messageId);
    if (previewUrl) {
      console.log('  Preview :', previewUrl);
    }
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  } catch (err) {
    console.error('[EMAIL ERROR]', err);
    _logFallback(opts);
  }
}

function _logFallback(opts: { to: string; subject: string; text: string }) {
  console.log('');
  console.log('═══════════════════════════════════ [EMAIL LOG — not sent] ══');
  console.log('  To      :', opts.to);
  console.log('  Subject :', opts.subject);
  console.log('  Body    :');
  console.log(opts.text.split('\n').map((l) => '  ' + l).join('\n'));
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
}

// ── Public API ────────────────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const COLLEGE = process.env.NEXT_PUBLIC_COLLEGE_NAME || "JSPM's RSCOE";

/**
 * Send an email to the HOD notifying them of a new complaint.
 */
export async function sendHodNotificationEmail(
  hodEmail: string,
  hodName: string,
  complaint: EmailComplaintPayload,
  complainantName: string
): Promise<void> {
  const viewUrl = `${APP_URL}/admin/complaints`;
  const priorityEmoji =
    complaint.priority === 'URGENT' ? '🔴' :
    complaint.priority === 'HIGH'   ? '🟠' :
    complaint.priority === 'MEDIUM' ? '🟡' : '🟢';

  const subject = `[${complaint.priority}] New Grievance ${complaint.id} — ${complaint.category}`;

  const text = [
    `Dear ${hodName},`,
    '',
    `A new grievance has been filed in your department (${complaint.department}) and requires your attention.`,
    '',
    `Complaint ID  : ${complaint.id}`,
    `Title         : ${complaint.title}`,
    `Category      : ${complaint.category}${complaint.subcategory ? ' > ' + complaint.subcategory : ''}`,
    `Priority      : ${priorityEmoji} ${complaint.priority}`,
    `Filed by      : ${complainantName}`,
    `Submitted at  : ${new Date(complaint.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    '',
    `Description:`,
    complaint.description.slice(0, 300) + (complaint.description.length > 300 ? '…' : ''),
    '',
    `View & manage this complaint:`,
    viewUrl,
    '',
    `— ${COLLEGE} Grievance Portal`,
  ].join('\n');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#1e3a5f,#1d4ed8);padding:24px 32px">
        <h1 style="margin:0;font-size:20px;color:#fff">🎓 ${COLLEGE}</h1>
        <p style="margin:4px 0 0;font-size:13px;color:#93c5fd">Grievance Management Portal</p>
      </div>
      <div style="padding:32px">
        <p style="color:#94a3b8;margin:0 0 16px">Dear <strong style="color:#fff">${hodName}</strong>,</p>
        <p style="color:#94a3b8;margin:0 0 24px">A new grievance has been filed in your department and requires your attention.</p>

        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;margin-bottom:24px">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px;width:120px">Complaint ID</td><td style="padding:6px 0;color:#f1f5f9;font-size:13px;font-weight:600">${complaint.id}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px">Title</td><td style="padding:6px 0;color:#f1f5f9;font-size:13px">${complaint.title}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px">Category</td><td style="padding:6px 0;color:#f1f5f9;font-size:13px">${complaint.category}${complaint.subcategory ? ' › ' + complaint.subcategory : ''}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px">Priority</td><td style="padding:6px 0;font-size:13px;font-weight:700;color:${complaint.priority === 'URGENT' ? '#f87171' : complaint.priority === 'HIGH' ? '#fb923c' : complaint.priority === 'MEDIUM' ? '#fbbf24' : '#4ade80'}">${priorityEmoji} ${complaint.priority}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px">Filed by</td><td style="padding:6px 0;color:#f1f5f9;font-size:13px">${complainantName}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px">Submitted</td><td style="padding:6px 0;color:#f1f5f9;font-size:13px">${new Date(complaint.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>
          </table>
        </div>

        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin-bottom:24px">
          <p style="margin:0 0 8px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px">Description</p>
          <p style="margin:0;color:#cbd5e1;font-size:13px;line-height:1.6">${complaint.description.slice(0, 400)}${complaint.description.length > 400 ? '…' : ''}</p>
        </div>

        <a href="${viewUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
          View &amp; Manage Complaint →
        </a>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center">
        <p style="margin:0;color:#475569;font-size:11px">${COLLEGE} · Grievance Portal · Automated Notification</p>
      </div>
    </div>
  `;

  await sendMail({ to: hodEmail, subject, html, text });
}

/**
 * Send a confirmation email to the student who filed the complaint.
 */
export async function sendStudentConfirmationEmail(
  studentEmail: string,
  studentName: string,
  complaint: EmailComplaintPayload
): Promise<void> {
  const subject = `Your Grievance ${complaint.id} Has Been Received — ${COLLEGE}`;

  const text = [
    `Dear ${studentName},`,
    '',
    `Thank you for submitting your grievance. We have received your complaint and it is now under review.`,
    '',
    `Complaint ID  : ${complaint.id}`,
    `Title         : ${complaint.title}`,
    `Category      : ${complaint.category}${complaint.subcategory ? ' > ' + complaint.subcategory : ''}`,
    `Priority      : ${complaint.priority}`,
    `Submitted at  : ${new Date(complaint.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    '',
    `What happens next:`,
    `  • Your complaint has been forwarded to the Head of Department`,
    `  • You will be notified when its status changes`,
    `  • You can track progress at: ${APP_URL}/student/complaints`,
    '',
    `Please retain your Complaint ID (${complaint.id}) for future reference.`,
    '',
    `— ${COLLEGE} Grievance Portal`,
  ].join('\n');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#064e3b,#059669);padding:24px 32px">
        <h1 style="margin:0;font-size:20px;color:#fff">✅ Complaint Received</h1>
        <p style="margin:4px 0 0;font-size:13px;color:#6ee7b7">${COLLEGE}</p>
      </div>
      <div style="padding:32px">
        <p style="color:#94a3b8;margin:0 0 16px">Dear <strong style="color:#fff">${studentName}</strong>,</p>
        <p style="color:#94a3b8;margin:0 0 24px">
          Your grievance has been successfully submitted and is now under review by the Head of Department.
        </p>

        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;margin-bottom:24px">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px;width:120px">Complaint ID</td><td style="padding:6px 0;color:#34d399;font-size:14px;font-weight:700">${complaint.id}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px">Title</td><td style="padding:6px 0;color:#f1f5f9;font-size:13px">${complaint.title}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px">Category</td><td style="padding:6px 0;color:#f1f5f9;font-size:13px">${complaint.category}${complaint.subcategory ? ' › ' + complaint.subcategory : ''}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px">Priority</td><td style="padding:6px 0;color:#f1f5f9;font-size:13px">${complaint.priority}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px">Submitted</td><td style="padding:6px 0;color:#f1f5f9;font-size:13px">${new Date(complaint.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>
          </table>
        </div>

        <div style="background:#052e16;border:1px solid #166534;border-radius:8px;padding:16px;margin-bottom:24px">
          <p style="margin:0 0 8px;color:#4ade80;font-size:12px;font-weight:600">What happens next</p>
          <ul style="margin:0;padding-left:20px;color:#86efac;font-size:13px;line-height:2">
            <li>Your complaint is forwarded to the Head of Department</li>
            <li>You will receive notifications when the status changes</li>
            <li>Please keep your Complaint ID for reference: <strong>${complaint.id}</strong></li>
          </ul>
        </div>

        <a href="${APP_URL}/student/complaints" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
          Track Your Complaint →
        </a>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center">
        <p style="margin:0;color:#475569;font-size:11px">${COLLEGE} · Grievance Portal · Automated Confirmation</p>
      </div>
    </div>
  `;

  await sendMail({ to: studentEmail, subject, html, text });
}
