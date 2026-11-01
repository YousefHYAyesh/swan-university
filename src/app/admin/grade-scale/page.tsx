import { PageHeader, Panel } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getScale } from "@/server/academic";
import { GradeScaleForm } from "../admin-forms";

export const metadata = { title: "Grade scale" };

export default async function GradeScalePage() {
  await requireRole("ADMIN");
  const scale = await getScale();
  return (
    <>
      <PageHeader
        title="Grade scale"
        description="How weighted percentages become letter grades and grade points. The default is the standard Turkish university AA–FF scale."
      />
      <Panel>
        <GradeScaleForm rows={scale} />
      </Panel>
    </>
  );
}
