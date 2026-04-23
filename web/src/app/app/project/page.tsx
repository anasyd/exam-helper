import { Suspense } from "react";
import { ProjectView } from "@/components/project-view";

export default function ProjectPage() {
  return (
    <Suspense>
      <ProjectView />
    </Suspense>
  );
}
