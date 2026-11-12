import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLogin } from "@/components/admin-login";
import { adminConfigured } from "@/lib/auth";
import { adminOk } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await adminOk())) return <AdminLogin configured={adminConfigured()} />;
  return <AdminDashboard />;
}
