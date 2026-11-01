import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/components/ui";
import { db } from "@/db";
import { sections } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { courseOptions, instructorOptions, termOptions } from "@/server/admin";
import { SectionForm } from "../../admin-forms";

export default async function EditSection({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const id = Number((await params).id);
  const [section, courses, terms, instructors] = await Promise.all([
    db.query.sections.findFirst({ where: eq(sections.id, id), with: { meetings: true, course: true } }),
    courseOptions(),
    termOptions(),
    instructorOptions(),
  ]);
  if (!section) notFound();
  return (
    <>
      <PageHeader back={{ href: `/admin/sections?term=${section.termId}`, label: "Sections" }} title={`${section.course.code} · section ${section.code}`} />
      <Panel>
        <SectionForm values={section} courses={courses} terms={terms} instructors={instructors} />
      </Panel>
    </>
  );
}
