"use client";

import { createAuthClient } from "better-auth/react";

const baseURL = process.env.NEXT_PUBLIC_AUTH_URL;

if (!baseURL) {
  console.warn(
    "[auth] NEXT_PUBLIC_AUTH_URL is not set — auth features will not work.",
  );
}

export const authClient = createAuthClient({
  baseURL: baseURL ?? "http://localhost:4000",
  fetchOptions: {
    credentials: "include",
  },
});

export const { useSession, signIn, signUp, signOut } = authClient;
