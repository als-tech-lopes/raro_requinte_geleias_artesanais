import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/services/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
