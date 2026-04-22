"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LandingNav } from "./_components/landing-nav";
import { Hero } from "./_components/hero";
import { DemoVideo } from "./_components/demo-video";
import { Features } from "./_components/features";
import { HowItWorks } from "./_components/how-it-works";
import { Faq } from "./_components/faq";
import { Footer } from "./_components/footer";

function ShareRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const share = searchParams.get("share");
    if (share) {
      router.replace(`/app?share=${encodeURIComponent(share)}`);
    }
  }, [router, searchParams]);

  return null;
}

export default function LandingPage() {
  return (
    <>
      <Suspense fallback={null}>
        <ShareRedirect />
      </Suspense>
      <LandingNav />
      <main>
        <Hero />
        <DemoVideo />
        <Features />
        <HowItWorks />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
