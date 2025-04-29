"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ProjectList } from "@/components/project-list";
import { SharedProjectHandler } from "@/components/shared-project-handler";

export default function Home() {
  return (
    <>
      <ProjectList />

      <Suspense fallback={null}>
        <SharedProjectHandler />
      </Suspense>
    </>
  );
}
