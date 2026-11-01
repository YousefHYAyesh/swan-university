import { DAYS, hhmm } from "@/lib/utils";

interface GridItem {
  key: string | number;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  title: string;
  subtitle?: string;
  tone?: number;
}

const START = 8 * 60;
const END = 19 * 60;
const HOUR_PX = 56;
const TONES = ["bg-lake-wash border-lake/40", "bg-ok-wash border-ok/40", "bg-amber-wash border-amber/40", "bg-[#eef0fb] border-[#5b64b8]/40", "bg-[#f6ecf3] border-[#9a4f84]/40"];
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Monday–Friday timetable with time-positioned blocks. */
export function WeekGrid({ items }: { items: GridItem[] }) {
  const hours = Array.from({ length: (END - START) / 60 }, (_, i) => START / 60 + i);
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-[56px_repeat(5,1fr)]">
        <div />
        {[1, 2, 3, 4, 5].map((d) => (
          <div key={d} className="border-b border-line px-2 pb-2 text-sm font-medium">
            {DAYS[d]}
          </div>
        ))}
        <div className="relative" style={{ height: hours.length * HOUR_PX }}>
          {hours.map((h, i) => (
            <div key={h} className="absolute right-2 -translate-y-2 text-xs text-muted" style={{ top: i * HOUR_PX }}>
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((d) => (
          <div key={d} className="relative border-l border-line" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <div key={h} className="absolute inset-x-0 border-t border-line/60" style={{ top: i * HOUR_PX }} />
            ))}
            {items
              .filter((it) => it.dayOfWeek === d)
              .map((it) => {
                const top = ((toMin(it.startsAt) - START) / 60) * HOUR_PX;
                const height = ((toMin(it.endsAt) - toMin(it.startsAt)) / 60) * HOUR_PX;
                return (
                  <div
                    key={it.key}
                    className={`absolute inset-x-1 overflow-hidden rounded-[var(--radius-control)] border-l-4 px-2 py-1.5 text-xs ${TONES[(it.tone ?? 0) % TONES.length]}`}
                    style={{ top, height: height - 2 }}
                  >
                    <div className="font-semibold text-ink">{it.title}</div>
                    <div className="text-ink-soft">
                      {hhmm(it.startsAt)}–{hhmm(it.endsAt)}
                    </div>
                    {it.subtitle && <div className="truncate text-ink-soft">{it.subtitle}</div>}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
