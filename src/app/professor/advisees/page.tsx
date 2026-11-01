import Link from "next/link";
import { Badge, Empty, PageHeader, Panel, Table, Td, Th } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { adviseesOf } from "@/server/professor";
import { STANDING_LABEL, academicSummary } from "@/server/records";

export const metadata = { title: "Advisees" };

export default async function AdviseesPage() {
  const user = await requireRole("PROFESSOR");
  const advisees = await adviseesOf(user.id);
  const rows = await Promise.all(advisees.map(async (s) => ({ s, summary: await academicSummary(s.userId) })));
  rows.sort((a, b) => (a.summary.cgpa ?? 5) - (b.summary.cgpa ?? 5));
  return (
    <>
      <PageHeader title="Advisees" description="Students you advise, lowest GPA first so the ones who need a conversation are at the top." />
      <Panel flush>
        {rows.length === 0 ? (
          <Empty title="You have no advisees" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Program</Th>
                <Th className="text-right">CGPA</Th>
                <Th className="text-right">Credits</Th>
                <Th>Standing</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, summary }) => (
                <tr key={s.userId}>
                  <Td>
                    <Link href={`/professor/advisees/${s.userId}`} className="font-medium hover:text-lake">
                      {s.user.firstName} {s.user.lastName}
                    </Link>
                    <div className="text-muted">{s.studentNo}</div>
                  </Td>
                  <Td className="text-ink-soft">{s.program.name}</Td>
                  <Td className="text-right font-medium">{summary.cgpa?.toFixed(2) ?? "—"}</Td>
                  <Td className="text-right">{summary.earnedCredits}</Td>
                  <Td>
                    <Badge tone={STANDING_LABEL[summary.standing].tone}>{STANDING_LABEL[summary.standing].label}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
