const LOGO = `
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
  <tr>
    <td style="vertical-align:middle;padding-right:8px;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
        <defs>
          <linearGradient id="lbar" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#e8b870"/><stop offset="100%" stop-color="#8a5020"/></linearGradient>
          <radialGradient id="ldot" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff4d6"/><stop offset="60%" stop-color="#fcd98a"/><stop offset="100%" stop-color="#c99252"/></radialGradient>
        </defs>
        <rect x="4" y="5.5" width="24" height="5" rx="2.5" fill="url(#lbar)"/>
        <rect x="4" y="13.5" width="16" height="5" rx="2.5" fill="url(#lbar)"/>
        <rect x="4" y="21.5" width="24" height="5" rx="2.5" fill="url(#lbar)"/>
        <circle cx="24" cy="16" r="3.8" fill="url(#ldot)"/>
      </svg>
    </td>
    <td style="vertical-align:middle;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:#b8854a;font-family:-apple-system,system-ui,sans-serif;">
      exam-helper
    </td>
  </tr>
</table>
`.trim();

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="dark"/>
<meta name="supported-color-schemes" content="dark"/>
</head>
<body style="margin:0;padding:0;background-color:#0e0e0c;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0e0e0c;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#141412;border-radius:4px;padding:40px;font-family:Georgia,serif;color:#f0ede6;line-height:1.7;">
        <tr><td>
          ${body}
        </td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`.trim();
}

export function welcomeEmail(opts: {
  name?: string | null;
  appUrl: string;
}): string {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hi,";
  return wrap(`
${LOGO}
<h1 style="font-size:28px;font-weight:400;letter-spacing:-0.01em;margin:0 0 20px;color:#f0ede6;">Welcome to exam-helper</h1>
<p style="margin:0 0 12px;color:#f0ede6;font-size:17px;">${greeting}</p>
<p style="margin:0 0 20px;color:#c8c3b8;">Your account is active. Here's what you can do right now:</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;width:100%;">
  <tr>
    <td style="width:10px;vertical-align:middle;"><div style="width:6px;height:6px;background:#b8854a;border-radius:50%;"></div></td>
    <td style="padding:10px 0 10px 12px;color:#c8c3b8;border-bottom:1px solid #2c2a26;">Upload a PDF and generate flashcards, study guides, and a roadmap</td>
  </tr>
  <tr>
    <td style="width:10px;vertical-align:middle;"><div style="width:6px;height:6px;background:#b8854a;border-radius:50%;"></div></td>
    <td style="padding:10px 0 10px 12px;color:#c8c3b8;border-bottom:1px solid #2c2a26;">Bring your own AI key — Gemini, OpenAI, Claude, or OpenRouter</td>
  </tr>
  <tr>
    <td style="width:10px;vertical-align:middle;"><div style="width:6px;height:6px;background:#b8854a;border-radius:50%;"></div></td>
    <td style="padding:10px 0 10px 12px;color:#c8c3b8;">Study anywhere — progress syncs across all your devices</td>
  </tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
  <tr>
    <td style="border-radius:24px;background-color:#b8854a;">
      <a href="${opts.appUrl}" style="display:inline-block;padding:12px 28px;color:#fafaf7;text-decoration:none;font-family:-apple-system,system-ui,sans-serif;font-size:14px;font-weight:500;border-radius:24px;">Get started →</a>
    </td>
  </tr>
</table>
<div style="border-top:1px solid #2c2a26;padding-top:20px;font-family:-apple-system,system-ui,sans-serif;font-size:12px;color:#55534e;">
  You're receiving this because you signed up for exam-helper.
</div>
`);
}

function markdownToEmailHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;

  const inline = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f0ede6;">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#b8854a;">$1</a>');

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#{1,3}\s/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p style="margin:0 0 12px;color:#f0ede6;font-size:17px;font-weight:600;">${inline(line.replace(/^#{1,3}\s/, ""))}</p>`);
    } else if (/^[-*]\s/.test(line)) {
      if (!inList) { out.push('<ul style="margin:0 0 16px;padding-left:20px;color:#c8c3b8;">'); inList = true; }
      out.push(`<li style="margin-bottom:6px;">${inline(line.replace(/^[-*]\s/, ""))}</li>`);
    } else if (line === "") {
      if (inList) { out.push('</ul>'); inList = false; }
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p style="margin:0 0 16px;color:#c8c3b8;">${inline(line)}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  return out.join("\n");
}

export function broadcastEmail(opts: {
  name?: string | null;
  message: string;
  unsubscribeUrl: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hi,";
  const bodyHtml = markdownToEmailHtml(opts.message);
  const ctaHtml = opts.ctaLabel && opts.ctaUrl
    ? `<table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="border-radius:24px;background-color:#b8854a;">
      <a href="${opts.ctaUrl}" style="display:inline-block;padding:12px 28px;color:#fafaf7;text-decoration:none;font-family:-apple-system,system-ui,sans-serif;font-size:14px;font-weight:500;border-radius:24px;">${opts.ctaLabel}</a>
    </td>
  </tr>
</table>`
    : "";
  return wrap(`
${LOGO}
<p style="margin:0 0 20px;color:#f0ede6;font-size:17px;">${greeting}</p>
${bodyHtml}
${ctaHtml}
<div style="border-top:1px solid #2c2a26;padding-top:20px;font-family:-apple-system,system-ui,sans-serif;font-size:12px;color:#55534e;">
  You're receiving this because you have an account on exam-helper. &nbsp;
  <a href="${opts.unsubscribeUrl}" style="color:#908e89;">Unsubscribe</a>
</div>
`);
}

export function subscriptionStartedEmail(opts: {
  name?: string | null;
  tier: string;
  appUrl: string;
}): string {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hi,";
  const tierLabel = opts.tier.charAt(0).toUpperCase() + opts.tier.slice(1);
  return wrap(`
${LOGO}
<h1 style="font-size:28px;font-weight:400;letter-spacing:-0.01em;margin:0 0 20px;color:#f0ede6;">You're on ${tierLabel} — thank you!</h1>
<p style="margin:0 0 12px;color:#f0ede6;font-size:17px;">${greeting}</p>
<p style="margin:0 0 20px;color:#c8c3b8;">Your ${tierLabel} plan is now active. Here's what you've unlocked:</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;width:100%;">
  <tr>
    <td style="width:10px;vertical-align:middle;"><div style="width:6px;height:6px;background:#b8854a;border-radius:50%;"></div></td>
    <td style="padding:10px 0 10px 12px;color:#c8c3b8;border-bottom:1px solid #2c2a26;">${opts.tier === "pro" ? "Unlimited projects" : "Up to 20 projects"}</td>
  </tr>
  <tr>
    <td style="width:10px;vertical-align:middle;"><div style="width:6px;height:6px;background:#b8854a;border-radius:50%;"></div></td>
    <td style="padding:10px 0 10px 12px;color:#c8c3b8;border-bottom:1px solid #2c2a26;">${opts.tier === "pro" ? "Up to 10 PDFs per project, 50 MB each" : "Up to 5 PDFs per project, 25 MB each"}</td>
  </tr>
  <tr>
    <td style="width:10px;vertical-align:middle;"><div style="width:6px;height:6px;background:#b8854a;border-radius:50%;"></div></td>
    <td style="padding:10px 0 10px 12px;color:#c8c3b8;">Priority support</td>
  </tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
  <tr>
    <td style="border-radius:24px;background-color:#b8854a;">
      <a href="${opts.appUrl}" style="display:inline-block;padding:12px 28px;color:#fafaf7;text-decoration:none;font-family:-apple-system,system-ui,sans-serif;font-size:14px;font-weight:500;border-radius:24px;">Go to dashboard →</a>
    </td>
  </tr>
</table>
<div style="border-top:1px solid #2c2a26;padding-top:20px;font-family:-apple-system,system-ui,sans-serif;font-size:12px;color:#55534e;">
  You're receiving this because you subscribed to exam-helper.
</div>
`);
}

export function subscriptionCancelledEmail(opts: {
  name?: string | null;
  tier: string;
  periodEnd: string;
  appUrl: string;
}): string {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hi,";
  const tierLabel = opts.tier.charAt(0).toUpperCase() + opts.tier.slice(1);
  return wrap(`
${LOGO}
<h1 style="font-size:28px;font-weight:400;letter-spacing:-0.01em;margin:0 0 20px;color:#f0ede6;">Sorry to see you go</h1>
<p style="margin:0 0 12px;color:#f0ede6;font-size:17px;">${greeting}</p>
<p style="margin:0 0 20px;color:#c8c3b8;">Your ${tierLabel} subscription has been cancelled. You'll keep full access until <strong style="color:#f0ede6;">${opts.periodEnd}</strong>, after which your account moves to the free plan.</p>
<p style="margin:0 0 20px;color:#c8c3b8;">Your projects and data are never deleted — they'll be waiting if you decide to come back.</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
  <tr>
    <td style="border-radius:24px;background-color:#b8854a;">
      <a href="${opts.appUrl}/pricing" style="display:inline-block;padding:12px 28px;color:#fafaf7;text-decoration:none;font-family:-apple-system,system-ui,sans-serif;font-size:14px;font-weight:500;border-radius:24px;">Resubscribe →</a>
    </td>
  </tr>
</table>
<div style="border-top:1px solid #2c2a26;padding-top:20px;font-family:-apple-system,system-ui,sans-serif;font-size:12px;color:#55534e;">
  You're receiving this because you had a subscription on exam-helper.
</div>
`);
}

export function verificationEmail(opts: {
  name?: string | null;
  verifyUrl: string;
}): string {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hi,";
  return wrap(`
${LOGO}
<h1 style="font-size:28px;font-weight:400;letter-spacing:-0.01em;margin:0 0 20px;color:#f0ede6;">Verify your email</h1>
<p style="margin:0 0 12px;color:#f0ede6;font-size:17px;">${greeting}</p>
<p style="margin:0 0 28px;color:#c8c3b8;">Thanks for signing up. Click the button below to verify your email address — the link is good for 24 hours.</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
  <tr>
    <td style="border-radius:24px;background-color:#b8854a;">
      <a href="${opts.verifyUrl}" style="display:inline-block;padding:12px 28px;color:#fafaf7;text-decoration:none;font-family:-apple-system,system-ui,sans-serif;font-size:14px;font-weight:500;border-radius:24px;">Verify email →</a>
    </td>
  </tr>
</table>
<p style="font-size:13px;color:#908e89;margin:0 0 32px;">
  Or paste this link into your browser:<br/>
  <code style="word-break:break-all;color:#c8c3b8;font-size:12px;">${opts.verifyUrl}</code>
</p>
<div style="border-top:1px solid #2c2a26;padding-top:20px;font-family:-apple-system,system-ui,sans-serif;font-size:12px;color:#55534e;">
  If you didn't sign up for exam-helper, you can safely ignore this email.
</div>
`);
}

export function resetPasswordEmail(opts: {
  name?: string | null;
  resetUrl: string;
}): string {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hi,";
  return wrap(`
${LOGO}
<h1 style="font-size:28px;font-weight:400;letter-spacing:-0.01em;margin:0 0 20px;color:#f0ede6;">Reset your password</h1>
<p style="margin:0 0 12px;color:#f0ede6;font-size:17px;">${greeting}</p>
<p style="margin:0 0 28px;color:#c8c3b8;">We received a request to reset your password. Click the button below to pick a new one — the link expires in 1 hour.</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
  <tr>
    <td style="border-radius:24px;background-color:#b8854a;">
      <a href="${opts.resetUrl}" style="display:inline-block;padding:12px 28px;color:#fafaf7;text-decoration:none;font-family:-apple-system,system-ui,sans-serif;font-size:14px;font-weight:500;border-radius:24px;">Reset password →</a>
    </td>
  </tr>
</table>
<p style="font-size:13px;color:#908e89;margin:0 0 32px;">
  Or paste this link into your browser:<br/>
  <code style="word-break:break-all;color:#c8c3b8;font-size:12px;">${opts.resetUrl}</code>
</p>
<div style="border-top:1px solid #2c2a26;padding-top:20px;font-family:-apple-system,system-ui,sans-serif;font-size:12px;color:#55534e;">
  If you didn't request this, you can safely ignore the email — your password won't change.
</div>
`);
}
