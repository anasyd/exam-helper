import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { mongo, db, userCol } from "./db.js";
import { config } from "./config.js";
import { sendEmail } from "./email/resend.js";
import { verificationEmail, resetPasswordEmail } from "./email/templates.js";

async function isInviteOnly(): Promise<boolean> {
  if (config.REGISTRATION_MODE !== "invite-only") return false;
  const adminCount = await userCol().countDocuments({ planTier: "admin" });
  return adminCount > 0;
}

export const auth = betterAuth({
  database: mongodbAdapter(db()),
  baseURL: config.BETTER_AUTH_URL,
  secret: config.BETTER_AUTH_SECRET,

  trustedOrigins: [config.FRONTEND_URL],

  user: {
    additionalFields: {
      planTier: { type: "string", defaultValue: "free", required: false },
      welcomeEmailSent: { type: "boolean", defaultValue: false, required: false },
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    ...(config.RESEND_API_KEY && config.RESEND_FROM_EMAIL
      ? {
          sendResetPassword: async ({ user, url }: { user: { email: string; name: string }; url: string }) => {
            await sendEmail({
              to: user.email,
              subject: "Reset your exam-helper password",
              html: resetPasswordEmail({ name: user.name, resetUrl: url }),
            });
          },
        }
      : {}),
    beforeSignUp: async () => {
      if (await isInviteOnly()) {
        throw new Error("Registration is invite-only on this instance.");
      }
    },
  },

  emailVerification: config.RESEND_API_KEY && config.RESEND_FROM_EMAIL
    ? {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }: { user: { email: string; name: string }; url: string }) => {
          // Send user to a frontend confirm page first so they click a button
          // before the token is consumed — the page then calls Better Auth with
          // the correct callbackURL pointing to /verified (animation page).
          const parsedUrl = new URL(url);
          const token = parsedUrl.searchParams.get("token") ?? "";
          const confirmUrl = `${config.FRONTEND_URL}/confirm-email?token=${encodeURIComponent(token)}`;
          await sendEmail({
            to: user.email,
            subject: "Verify your exam-helper email",
            html: verificationEmail({ name: user.name, verifyUrl: confirmUrl }),
          });
        },
      }
    : undefined,

  account: {
    accountLinking: {
      enabled: true,
      // Google is trusted: signing in with Google auto-links to an existing
      // email/password account (e.g. the admin account created via setup wizard)
      trustedProviders: ["google", "email-password"],
    },
  },

  socialProviders: {
    ...(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: config.GOOGLE_CLIENT_ID,
            clientSecret: config.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Block new social-login signups in invite-only mode
          if (await isInviteOnly()) {
            throw new Error("Registration is invite-only on this instance.");
          }
          return { data: user };
        },
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // rolling refresh once per day
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  advanced: {
    useSecureCookies: config.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "none",
      secure: config.NODE_ENV === "production",
      httpOnly: true,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
