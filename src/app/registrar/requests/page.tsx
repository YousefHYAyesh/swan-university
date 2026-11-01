import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { Badge, Empty, PageHeader, Panel } from "@/components/ui";
import { db } from "@/db";
import { studentRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { REQUEST_STATUS, REQUEST_TYPE } from "@/lib/labels";
import { cn, formatDate } from "@/lib/utils";
import { RequestReply } from "./request-row";

export const metadata = { title: "Requests" };

export default async function RegistrarRequests({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await requireRole("REGISTRAR");
  const { view = "open" } = await searchParams;
  const rows = await db.query.studentRequests.findMany({
    where: view === "open" ? inArray(studentRequests.status, ["PENDING", "IN_PROGRESS"]) : inArray(studentRequests.status, ["COMPLETED", "REJECTED"]),
    with: { student: { with: { user: true } } },
    orderBy: [desc(studentRequests.createdAt)],
    limit: 100,
  });
  return (
    <>
      <PageHeader title="Requests" description="Documents and appeals from students. Students see your reply on their requests page." />
      <nav className="mb-4 flex gap-1 border-b border-line">
        {[
          ["open", "Open"],
          ["closed", "Closed"],
        ].map(([k, l]) => (
          <Link
            key={k}
            href={`/registrar/requests?view=${k}`}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm", view === k ? "border-lake font-medium" : "border-transparent text-muted hover:text-ink")}
          >
            {l}
          </Link>
        ))}
      </nav>
      <Panel flush>
        {rows.length === 0 ? (
          <Empty title={view === "open" ? "No open requests" : "No closed requests yet"} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{REQUEST_TYPE[r.type]}</span>
                    <span className="text-muted"> from </span>
                    <Link href={`/registrar/students/${r.studentId}`} className="text-lake hover:underline">
                      {r.student.user.firstName} {r.student.user.lastName}
                    </Link>
                    <span className="text-muted"> · {formatDate(r.createdAt)}</span>
                  </div>
                  <Badge tone={REQUEST_STATUS[r.status].tone}>{REQUEST_STATUS[r.status].label}</Badge>
                </div>
                {r.note && <p className="mt-1 text-sm text-ink-soft">{r.note}</p>}
                <RequestReply id={r.id} status={r.status} response={r.response} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
