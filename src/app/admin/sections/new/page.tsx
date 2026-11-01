import { PageHeader, Panel } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { courseOptions, instructorOptions, termOptions } from "@/server/admin";
import { SectionForm } from "../../admin-forms";

export const metadata = { title: "Add section" };

export default async function NewSection({ searchParams }: { searchParams: Promise<{ term?: string }> }) {
  await requireRole("ADMIN");
  const { term } = await searchParams;
  const [courses, terms, instructors] = await Promise.all([courseOptions(), termOptions(), instructorOptions()]);
  return (
    <>
      <PageHeader back={{ href: "/admin/sections", label: "Sections" }} title="Add section" />
      <Panel>
        <SectionForm courses={courses} terms={terms} instructors={instructors} defaultTermId={Number(term) || undefined} />
      </Panel>
    </>
  );
}
