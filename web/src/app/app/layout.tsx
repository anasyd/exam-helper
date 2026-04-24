import { ServerSync } from "@/components/server-sync";
import { AuthGuard } from "@/components/auth-guard";
import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ServerSync />
      <AppNav />
      {children}
    </AuthGuard>
  );
}
