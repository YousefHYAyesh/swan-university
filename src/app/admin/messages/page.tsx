import { desc } from "drizzle-orm";
import { Badge, Empty, PageHeader, Panel } from "@/components/ui";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { MessageToggle } from "../admin-forms";

export const metadata = { title: "Contact messages" };

export default async function MessagesPage() {
  await requireRole("ADMIN");
  const rows = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(100);
  return (
    <>
      <PageHeader title="Contact messages" description="Sent from the contact form on the public home page." />
      <Panel flush>
        {rows.length === 0 ? (
          <Empty title="No messages" />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((m) => (
              <li key={m.id} className={`px-5 py-4 ${m.readAt ? "" : "bg-lake-wash/40"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{m.name}</span>{" "}
                    <a href={`mailto:${m.email}`} className="text-lake hover:underline">
                      {m.email}
                    </a>
                    <span className="text-muted"> · {formatDate(m.createdAt)}</span> {!m.readAt && <Badge tone="lake">New</Badge>}
                  </div>
                  <MessageToggle id={m.id} read={!!m.readAt} />
                </div>
                <p className="mt-1 max-w-[75ch] text-sm text-ink-soft">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
