"use client";

import { Suspense } from "react";
import { ProjectList } from "@/components/project-list";
import { SharedProjectHandler } from "@/components/shared-project-handler";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { CheckoutSuccessHandler } from "@/components/checkout-success-handler";

export default function AppHome() {
  return (
    <>
      <EmailVerificationBanner />
      <ProjectList />
      <Suspense fallback={null}>
        <SharedProjectHandler />
      </Suspense>
      <Suspense fallback={null}>
        <CheckoutSuccessHandler />
      </Suspense>
    </>
  );
}
