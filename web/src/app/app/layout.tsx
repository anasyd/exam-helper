import { ServerSync } from "@/components/server-sync";
import { AuthGuard } from "@/components/auth-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ServerSync />
      {children}
    </AuthGuard>
  );
}
