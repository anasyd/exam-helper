"use client";

import Script from "next/script";

export function PerfObserver() {
  return (
    <Script
      src="https://cloud.umami.is/script.js"
      data-website-id="216497cd-cf5b-46f6-82ff-be37ddfe35d3"
      strategy="afterInteractive"
    />
  );
}
