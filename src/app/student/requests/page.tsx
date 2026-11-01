import { desc, eq } from "drizzle-orm";
import { Badge, Empty, PageHeader, Panel } from "@/components/ui";
import { db } from "@/db";
import { studentRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { REQUEST_STATUS, REQUEST_TYPE } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { RequestForm } from "./request-form";

export const metadata = { title: "Requests" };

export default async function RequestsPage() {
  const user = await requireRole("STUDENT");
  const rows = await db.query.studentRequests.findMany({
    where: eq(studentRequests.studentId, user.id),
    orderBy: [desc(studentRequests.createdAt)],
  });
  return (
    <>
      <PageHeader title="Requests" description="Ask the registrar office for documents or raise a grade appeal." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel title="Your requests" flush>
          {rows.length === 0 ? (
            <Empty title="No requests yet" />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{REQUEST_TYPE[r.type]}</span>
                    <Badge tone={REQUEST_STATUS[r.status].tone}>{REQUEST_STATUS[r.status].label}</Badge>
                  </div>
                  {r.note && <p className="mt-1 text-sm text-ink-soft">{r.note}</p>}
                  {r.response && (
                    <p className="mt-2 rounded-[var(--radius-control)] bg-paper px-3 py-2 text-sm">
                      <span className="text-muted">Registrar: </span>
                      {r.response}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted">Sent {formatDate(r.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="New request">
          <RequestForm />
        </Panel>
      </div>
    </>
  );
}
