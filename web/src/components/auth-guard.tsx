"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { usePostHog } from "posthog-js/react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const ph = usePostHog();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/sign-in");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (session?.user) {
      ph?.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
      });
    }
  }, [session?.user?.id, ph]);

  if (isPending) return null;
  if (!session?.user) return null;

  return <>{children}</>;
}
