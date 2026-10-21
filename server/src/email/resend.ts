import { Resend } from "resend";
import { config } from "../config.js";
import { logger } from "../logger.js";

const client = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

export interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOpts): Promise<void> {
  if (!client || !config.RESEND_FROM_EMAIL) throw new Error("Email delivery is not configured");
  try {
    const result = await client.emails.send({
      from: config.RESEND_FROM_EMAIL!,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (result.error) {
      logger.error({ err: result.error, to: opts.to }, "resend send failed");
      throw new Error(`Email send failed: ${result.error.message}`);
    }
    logger.info({ to: opts.to, id: result.data?.id }, "email sent");
  } catch (err) {
    logger.error({ err, to: opts.to }, "resend send threw");
    throw err;
  }
}
