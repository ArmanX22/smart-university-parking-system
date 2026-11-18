import { requireAdmin } from "@/server/auth/guards";
import AdminPortal from "@/components/admin/admin-portal";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await requireAdmin();

  return (
    <AdminPortal
      user={{
        id: user.id,
        name: user.name || null,
        email: user.email,
        role: user.role,
      }}
    />
  );
}
