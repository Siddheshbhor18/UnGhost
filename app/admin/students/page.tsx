import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StudentRosterTable } from "@/components/admin/StudentRosterTable";
import { listApplications, listBootcamps, listUsers } from "@/server/store";

export default async function StudentRoster() {
  const [students, apps, bcs] = await Promise.all([
    listUsers("student"),
    listApplications(),
    listBootcamps(),
  ]);
  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        badge="Students"
        title="Student roster"
        subtitle="Sortable, filterable, exportable. Click a row for the full record: interview phase, video progress, skill verifications."
      />
      <StudentRosterTable students={students} applications={apps} bootcamps={bcs} />
    </div>
  );
}
