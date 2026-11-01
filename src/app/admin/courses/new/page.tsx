import { PageHeader, Panel } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { courseOptions, departmentOptions } from "@/server/admin";
import { CourseForm } from "../../admin-forms";

export const metadata = { title: "Add course" };

export default async function NewCourse() {
  await requireRole("ADMIN");
  const [departments, courses] = await Promise.all([departmentOptions(), courseOptions()]);
  return (
    <>
      <PageHeader back={{ href: "/admin/courses", label: "Courses" }} title="Add course" />
      <Panel>
        <CourseForm departments={departments} courses={courses} />
      </Panel>
    </>
  );
}
