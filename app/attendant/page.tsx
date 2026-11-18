import { requireAttendant, getAttendantAssignedArea } from "@/server/auth/guards";
import AttendantPortal from "@/components/attendant/attendant-portal";

export const dynamic = "force-dynamic";

export default async function AttendantDashboardPage() {
  const user = await requireAttendant();

  let assignedArea = null;
  try {
    assignedArea = await getAttendantAssignedArea(user.id);
  } catch {
    // Unassigned attendant fallback
  }

  return (
    <AttendantPortal
      user={{
        id: user.id,
        name: user.name || null,
        email: user.email,
        role: user.role,
      }}
      assignedArea={
        assignedArea
          ? {
              id: assignedArea.id,
              name: assignedArea.name,
              code: assignedArea.code,
              totalSlots: assignedArea.totalSlots,
            }
          : null
      }
    />
  );
}
