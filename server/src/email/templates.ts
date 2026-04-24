const BASE_STYLE = `
  font-family: Georgia, serif;
  color: #111111;
  background-color: #fafaf7;
  padding: 32px;
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.6;
`;

const BUTTON_STYLE = `
  display: inline-block;
  background-color: #111111;
  color: #fafaf7;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 2px;
  font-family: -apple-system, system-ui, sans-serif;
  font-size: 14px;
  font-weight: 500;
  margin: 24px 0;
`;

const FOOTER_STYLE = `
  font-family: -apple-system, system-ui, sans-serif;
  font-size: 12px;
  color: #55534e;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #e8e3d8;
`;

export function verificationEmail(opts: {
  name?: string | null;
  verifyUrl: string;
}): string {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hi,";
  return `
<div style="${BASE_STYLE}">
  <div style="margin-bottom: 24px; display: flex; align-items: center; gap: 8px;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="22" height="22" style="display:inline-block;vertical-align:middle;" aria-hidden="true">
      <defs>
        <linearGradient id="lbar" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#e8b870"/><stop offset="100%" stop-color="#8a5020"/></linearGradient>
        <radialGradient id="ldot" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff4d6"/><stop offset="60%" stop-color="#fcd98a"/><stop offset="100%" stop-color="#c99252"/></radialGradient>
      </defs>
      <rect x="4" y="5.5" width="24" height="5" rx="2.5" fill="url(#lbar)"/>
      <rect x="4" y="13.5" width="16" height="5" rx="2.5" fill="url(#lbar)"/>
      <rect x="4" y="21.5" width="24" height="5" rx="2.5" fill="url(#lbar)"/>
      <circle cx="24" cy="16" r="3.8" fill="url(#ldot)"/>
    </svg>
    <span style="font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; color: #b8854a; font-family: -apple-system, system-ui, sans-serif; vertical-align: middle;">exam-helper</span>
  </div>
  <h1 style="font-size: 28px; font-weight: 400; letter-spacing: -0.01em; margin: 0 0 16px;">Verify your email</h1>
  <p>${greeting}</p>
  <p>Thanks for signing up. Click the button below to verify your email address — it's good for 24 hours.</p>
  <a href="${opts.verifyUrl}" style="${BUTTON_STYLE}">Verify email →</a>
  <p style="font-size: 13px; color: #55534e;">
    Or paste this link into your browser:<br>
    <code style="word-break: break-all;">${opts.verifyUrl}</code>
  </p>
  <div style="${FOOTER_STYLE}">
    If you didn't sign up for exam-helper, you can safely ignore this email.
  </div>
</div>
`.trim();
}

export function resetPasswordEmail(opts: {
  name?: string | null;
  resetUrl: string;
}): string {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hi,";
  return `
<div style="${BASE_STYLE}">
  <div style="margin-bottom: 24px; display: flex; align-items: center; gap: 8px;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="22" height="22" style="display:inline-block;vertical-align:middle;" aria-hidden="true">
      <defs>
        <linearGradient id="lbar" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#e8b870"/><stop offset="100%" stop-color="#8a5020"/></linearGradient>
        <radialGradient id="ldot" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff4d6"/><stop offset="60%" stop-color="#fcd98a"/><stop offset="100%" stop-color="#c99252"/></radialGradient>
      </defs>
      <rect x="4" y="5.5" width="24" height="5" rx="2.5" fill="url(#lbar)"/>
      <rect x="4" y="13.5" width="16" height="5" rx="2.5" fill="url(#lbar)"/>
      <rect x="4" y="21.5" width="24" height="5" rx="2.5" fill="url(#lbar)"/>
      <circle cx="24" cy="16" r="3.8" fill="url(#ldot)"/>
    </svg>
    <span style="font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; color: #b8854a; font-family: -apple-system, system-ui, sans-serif; vertical-align: middle;">exam-helper</span>
  </div>
  <h1 style="font-size: 28px; font-weight: 400; letter-spacing: -0.01em; margin: 0 0 16px;">Reset your password</h1>
  <p>${greeting}</p>
  <p>We received a request to reset your password. Click the button below to pick a new one — the link expires in 1 hour.</p>
  <a href="${opts.resetUrl}" style="${BUTTON_STYLE}">Reset password →</a>
  <p style="font-size: 13px; color: #55534e;">
    Or paste this link into your browser:<br>
    <code style="word-break: break-all;">${opts.resetUrl}</code>
  </p>
  <div style="${FOOTER_STYLE}">
    If you didn't request this, you can safely ignore the email — your password won't change.
  </div>
</div>
`.trim();
}
