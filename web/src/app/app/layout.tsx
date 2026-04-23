import { ServerSync } from "@/components/server-sync";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServerSync />
      {children}
    </>
  );
}
