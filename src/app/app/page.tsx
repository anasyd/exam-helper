"use client";

import { Suspense } from "react";
import { ProjectList } from "@/components/project-list";
import { SharedProjectHandler } from "@/components/shared-project-handler";

export default function AppHome() {
  return (
    <>
      <ProjectList />
      <Suspense fallback={null}>
        <SharedProjectHandler />
      </Suspense>
    </>
  );
}
