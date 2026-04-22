"use client";

import { Suspense } from "react";
import { ProjectList } from "@/components/project-list";
import { SharedProjectHandler } from "@/components/shared-project-handler";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";

export default function AppHome() {
  return (
    <>
      <EmailVerificationBanner />
      <ProjectList />
      <Suspense fallback={null}>
        <SharedProjectHandler />
      </Suspense>
    </>
  );
}
