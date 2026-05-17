import { GlassBadge } from "@/components/glass";
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
      <div>
        <GlassBadge tone="brand">Students · Full Roster</GlassBadge>
        <h1 className="font-display text-4xl font-bold text-brand-ink mt-3">
          Every Student on the Grid
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Sortable, filterable, exportable. Click any row to see the full story — interview
          phase, video progress, skill verifications.
        </p>
      </div>
      <StudentRosterTable students={students} applications={apps} bootcamps={bcs} />
    </div>
  );
}
