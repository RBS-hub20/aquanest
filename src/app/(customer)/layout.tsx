import { requireUser } from "@/lib/auth";
import { CustomerBottomNav, CustomerSidebar } from "@/components/customer/sidebar";
import { CustomerTopbar } from "@/components/customer/topbar";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("CUSTOMER");
  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#F5FAFF_0%,#FFFFFF_60%)]">
      <CustomerSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <CustomerTopbar user={{ id: user.id, name: user.name, phone: user.phone, avatarUrl: user.avatarUrl }} />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
      </div>
      <CustomerBottomNav />
    </div>
  );
}
