import { AppNav } from "@/components/app-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
