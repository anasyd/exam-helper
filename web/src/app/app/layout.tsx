import { ServerSync } from "@/components/server-sync";
import { AuthGuard } from "@/components/auth-guard";
import { LandingNav } from "@/app/(landing)/_components/landing-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ServerSync />
      <LandingNav />
      {children}
    </AuthGuard>
  );
}
