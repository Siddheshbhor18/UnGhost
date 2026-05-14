import { SectionHeader } from "@/components/arcade/SectionHeader";
import { StudentRosterTable } from "@/components/admin/StudentRosterTable";
import { listApplications, listBootcamps, listUsers } from "@/lib/data/store";

export default function StudentRoster() {
  const students = listUsers("student");
  const apps = listApplications();
  const bcs = listBootcamps();
  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        eyebrow="STUDENTS · FULL ROSTER"
        title="Every Student on the Grid"
        subtitle="Sortable, filterable, exportable. Click any row to see the full story."
        color="blue"
      />
      <StudentRosterTable students={students} applications={apps} bootcamps={bcs} />
    </div>
  );
}
