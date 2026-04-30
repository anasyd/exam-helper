"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { toast } from "sonner";

export function CheckoutSuccessHandler() {
  const params = useSearchParams();
  const router = useRouter();
  const ph = usePostHog();

  useEffect(() => {
    if (params.get("checkout") === "success") {
      ph?.capture("subscription_checkout_completed");
      toast.success("Subscription activated! Your plan has been upgraded.");
      // Clean the query param without a page reload
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      router.replace(url.pathname + url.search);
    }
  }, [params, ph, router]);

  return null;
}
