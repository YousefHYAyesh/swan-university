import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { GRADE_COLORS } from "@/lib/grade-colors";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-sm text-muted hover:text-lake">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-[70ch] text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
  flush,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={cn("min-w-0 rounded-[var(--radius-panel)] border border-line bg-white", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-5 py-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

const buttonStyles = {
  primary: "bg-lake text-white hover:bg-lake-deep",
  secondary: "border border-line bg-white text-ink hover:border-lake hover:text-lake",
  danger: "bg-danger text-white hover:bg-[#8f1c25]",
  ghost: "text-lake hover:bg-lake-wash",
};

type ButtonVariant = keyof typeof buttonStyles;

export function buttonClass(variant: ButtonVariant = "primary", size: "sm" | "md" = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4",
    buttonStyles[variant],
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return <Link className={cn(buttonClass(variant, size), className)} {...props} />;
}

const controlClass =
  "w-full rounded-[var(--radius-control)] border border-line bg-white px-3 text-ink placeholder:text-muted/70 focus:border-lake focus:outline-none focus:ring-2 focus:ring-lake/20 disabled:bg-paper";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClass, "h-10", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClass, "h-10 pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClass, "min-h-24 py-2", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-sm font-medium text-ink-soft">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm text-danger">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-sm text-muted">{hint}</span>
      )}
    </label>
  );
}

const badgeTones = {
  neutral: "bg-paper text-ink-soft border-line",
  lake: "bg-lake-wash text-lake-deep border-lake/20",
  amber: "bg-amber-wash text-[#8a5d07] border-amber/30",
  danger: "bg-danger-wash text-danger border-danger/20",
  ok: "bg-ok-wash text-ok border-ok/20",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  );
}


export function GradeChip({ letter, size = "md" }: { letter: string | null | undefined; size?: "sm" | "md" }) {
  if (!letter) return <span className="text-muted">—</span>;
  const color = GRADE_COLORS[letter];
  return (
    <span
      title={`Letter grade ${letter}`}
      className={cn(
        "inline-flex items-center justify-center rounded-[5px] font-semibold tracking-wide",
        size === "sm" ? "h-6 min-w-8 px-1.5 text-xs" : "h-7 min-w-10 px-2 text-sm",
        color ? `${color} text-white` : "border border-line bg-paper text-ink-soft",
      )}
    >
      {letter}
    </span>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn("border-b border-line bg-paper/60 px-4 py-2.5 text-left font-medium text-muted", className)}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, ...props }: ComponentProps<"td">) {
  return (
    <td className={cn("border-b border-line/70 px-4 py-2.5 align-middle", className)} {...props}>
      {children}
    </td>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-[50ch] text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</div>
      {note && <div className="mt-0.5 text-sm text-ink-soft">{note}</div>}
    </div>
  );
}

export function Notice({
  tone = "lake",
  children,
}: {
  tone?: "lake" | "amber" | "danger" | "ok";
  children: ReactNode;
}) {
  const styles = {
    lake: "border-lake/25 bg-lake-wash text-lake-deep",
    amber: "border-amber/30 bg-amber-wash text-[#7a5206]",
    danger: "border-danger/25 bg-danger-wash text-danger",
    ok: "border-ok/25 bg-ok-wash text-ok",
  };
  return <div className={cn("rounded-[var(--radius-control)] border px-4 py-3 text-sm", styles[tone])}>{children}</div>;
}

export function DescList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-6 gap-y-2 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav className="flex items-center justify-between border-t border-line px-4 py-3 text-sm" aria-label="Pagination">
      <span className="text-muted">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link className={buttonClass("secondary", "sm")} href={hrefFor(page - 1)}>
            Previous
          </Link>
        )}
        {page < pageCount && (
          <Link className={buttonClass("secondary", "sm")} href={hrefFor(page + 1)}>
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}
