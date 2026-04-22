"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "./client";

export function useRequireAuth(
  redirectTo = "/sign-in",
): ReturnType<typeof useSession> {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.isPending) return;
    if (!session.data?.user) {
      router.replace(redirectTo);
    }
  }, [session.data, session.isPending, router, redirectTo]);

  return session;
}
