import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const SEASON = { FALL: "Fall", SPRING: "Spring", SUMMER: "Summer" } as const;

/** "2025–2026 Fall" */
export function termLabel(t: { startYear: number; season: keyof typeof SEASON }) {
  return `${t.startYear}–${t.startYear + 1} ${SEASON[t.season]}`;
}

/** Sortable key so terms compare in calendar order. */
export function termKey(t: { startYear: number; season: keyof typeof SEASON }) {
  return t.startYear * 10 + { FALL: 1, SPRING: 2, SUMMER: 3 }[t.season];
}

export const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const hhmm = (t: string) => t.slice(0, 5);

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const todayIso = () => new Date().toISOString().slice(0, 10);
