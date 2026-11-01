import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/components/ui";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { courseOptions, departmentOptions } from "@/server/admin";
import { CourseForm } from "../../admin-forms";

export default async function EditCourse({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const id = Number((await params).id);
  const [course, departments, all] = await Promise.all([
    db.query.courses.findFirst({ where: eq(courses.id, id), with: { prerequisites: true } }),
    departmentOptions(),
    courseOptions(),
  ]);
  if (!course) notFound();
  return (
    <>
      <PageHeader back={{ href: "/admin/courses", label: "Courses" }} title={`${course.code} ${course.title}`} />
      <Panel>
        <CourseForm departments={departments} courses={all} values={{ ...course, prerequisiteIds: course.prerequisites.map((p) => p.prerequisiteId) }} />
      </Panel>
    </>
  );
}
