import { LandingNav } from "@/app/(landing)/_components/landing-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingNav />
      {children}
    </>
  );
}
