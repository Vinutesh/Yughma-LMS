import { Resend } from "resend";

/**
 * Transactional email via Resend — the only outbound channel that exists.
 * Lazily constructed (not at module load), same pattern as `storage/r2.ts`:
 * the rest of the app keeps working with email simply unavailable when
 * these env vars aren't set yet, rather than crashing every server boot.
 * Every `platform.ts` mutation that calls into here already returns the
 * temp password / succeeds at the database write regardless of whether the
 * email actually sends — see `send()`'s own doc comment.
 */
let client: Resend | null = null;

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

export function isEmailConfigured(): boolean {
  return !!(getEnv("RESEND_API_KEY") && getEnv("EMAIL_FROM"));
}

function getClient(): Resend {
  if (client) return client;
  const apiKey = getEnv("RESEND_API_KEY");
  if (!apiKey) {
    throw new Error("Email isn't configured — set RESEND_API_KEY and EMAIL_FROM (see backend/.env.example).");
  }
  client = new Resend(apiKey);
  return client;
}

function appUrl(): string {
  return getEnv("APP_URL") ?? getEnv("CORS_ORIGIN") ?? "http://localhost:3000";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Best-effort: a failed send is logged, never thrown. The database write
 * that prompted this (account creation, access grant) already succeeded
 * before this runs, and the platform admin's response payload still carries
 * whatever needs relaying manually (the temp password) if the provider is
 * down or unconfigured — this is a convenience on top of that, not the only
 * path.
 */
async function send(to: string, subject: string, html: string): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    await getClient().emails.send({ from: getEnv("EMAIL_FROM")!, to, subject, html });
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
  }
}

export async function sendWelcomeEmail(to: string, name: string, tempPassword: string): Promise<void> {
  await send(
    to,
    "Your Yughma LMS account",
    `<p>Hi ${escapeHtml(name)},</p>
     <p>An account has been created for you on Yughma LMS.</p>
     <p><strong>Email:</strong> ${escapeHtml(to)}<br/>
     <strong>Temporary password:</strong> ${escapeHtml(tempPassword)}</p>
     <p><a href="${appUrl()}/login">Log in</a> to get started.</p>`,
  );
}

export async function sendAccessGrantedEmail(to: string, name: string, courseTitle: string): Promise<void> {
  await send(
    to,
    `You've been granted access to "${courseTitle}"`,
    `<p>Hi ${escapeHtml(name)},</p>
     <p>You now have access to <strong>${escapeHtml(courseTitle)}</strong> on Yughma LMS.</p>
     <p><a href="${appUrl()}/login">Log in</a> to start.</p>`,
  );
}
