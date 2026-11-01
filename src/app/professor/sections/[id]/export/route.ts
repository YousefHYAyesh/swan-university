import { getSession } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { getScale } from "@/server/academic";
import { getOwnedSection } from "@/server/professor";
import { currentPercent, letterFor } from "@/domain/grading";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || user.role !== "PROFESSOR") return new Response("Not allowed", { status: 403 });
  const { id } = await params;
  const [section, scale] = await Promise.all([getOwnedSection(Number(id), user.id), getScale()]);

  const header = ["Student no", "Last name", "First name", ...section.assessments.map((a) => `${a.name} (/${a.maxScore}, ${a.weight}%)`), "Percent so far", "Letter so far"];
  const rows = section.enrollments.map((e) => {
    const map = new Map(e.scores.map((s) => [s.assessmentId, s.score]));
    const running = currentPercent(section.assessments, map);
    return [
      e.student.studentNo,
      e.student.user.lastName,
      e.student.user.firstName,
      ...section.assessments.map((a) => map.get(a.id) ?? ""),
      running.percent ?? "",
      running.percent == null ? "" : letterFor(running.percent, scale),
    ];
  });
  const filename = `${section.course.code}-${section.code}-gradebook.csv`;
  return new Response(toCsv([header, ...rows]), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
