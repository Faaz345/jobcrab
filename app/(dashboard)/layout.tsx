import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isOnboarded: true },
  });

  if (!dbUser?.isOnboarded) {
    redirect("/onboarding");
  }

  return (
    <TooltipProvider>
      <DashboardShell>{children}</DashboardShell>
      <Toaster richColors position="bottom-right" />
    </TooltipProvider>
  );
}
