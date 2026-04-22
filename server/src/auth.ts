import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { mongo } from "./db.js";
import { config } from "./config.js";
import { sendEmail } from "./email/resend.js";
import { verificationEmail, resetPasswordEmail } from "./email/templates.js";

export const auth = betterAuth({
  database: mongodbAdapter(mongo.db()),
  baseURL: config.BETTER_AUTH_URL,
  secret: config.BETTER_AUTH_SECRET,

  trustedOrigins: [config.FRONTEND_URL, "http://localhost:3000"],

  emailAndPassword: {
    enabled: true,
    // Soft require — unverified users can still use the app; banner on frontend prompts verification.
    requireEmailVerification: false,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your exam-helper password",
        html: resetPasswordEmail({ name: user.name, resetUrl: url }),
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your exam-helper email",
        html: verificationEmail({ name: user.name, verifyUrl: url }),
      });
    },
  },

  socialProviders: {
    google: {
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
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
