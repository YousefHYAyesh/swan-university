export interface Meeting {
  dayOfWeek: number;
  startsAt: string; // "HH:MM" or "HH:MM:SS"
  endsAt: string;
}

export interface SectionForRegistration {
  id: number;
  courseId: number;
  courseCode: string;
  credits: number;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  capacity: number;
  enrolledCount: number;
  meetings: Meeting[];
  prerequisiteIds: number[];
  prerequisiteCodes: string[];
}

export interface CurrentSection {
  courseId: number;
  courseCode: string;
  credits: number;
  meetings: Meeting[];
}

export interface RegistrationContext {
  today: string; // YYYY-MM-DD
  window: { opensOn: string; closesOn: string };
  studentStatus: "ACTIVE" | "SUSPENDED" | "GRADUATED" | "WITHDRAWN";
  hasRegistrationHold: boolean;
  passedCourseIds: Set<number>;
  /** Latest approved letter per completed course, for the retake rule. */
  completed: Map<number, string>;
  current: CurrentSection[]; // sections already registered this term
  maxCredits: number;
}

/** Conditional passes can be retaken to raise the grade. */
const IMPROVABLE = new Set(["DC", "DD"]);

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export function meetingsOverlap(a: Meeting, b: Meeting): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  return toMinutes(a.startsAt) < toMinutes(b.endsAt) && toMinutes(b.startsAt) < toMinutes(a.endsAt);
}

/** Returns every reason the student can't take this section. Empty list means OK. */
export function registrationProblems(section: SectionForRegistration, ctx: RegistrationContext): string[] {
  const problems: string[] = [];

  if (ctx.today < ctx.window.opensOn || ctx.today > ctx.window.closesOn) {
    problems.push("Registration is closed for this term");
  }
  if (ctx.studentStatus !== "ACTIVE") problems.push("Only active students can register");
  if (ctx.hasRegistrationHold) problems.push("You have a registration hold; contact the registrar");
  if (section.status !== "OPEN") problems.push("This section isn't open for registration");
  if (section.enrolledCount >= section.capacity) problems.push("This section is full");

  if (ctx.current.some((c) => c.courseId === section.courseId)) {
    problems.push(`You're already registered for ${section.courseCode} this term`);
  }

  const earned = ctx.completed.get(section.courseId);
  if (earned && !IMPROVABLE.has(earned) && ctx.passedCourseIds.has(section.courseId)) {
    problems.push(`You already passed ${section.courseCode} with ${earned}`);
  }

  const missing = section.prerequisiteIds
    .map((id, i) => (ctx.passedCourseIds.has(id) ? null : section.prerequisiteCodes[i]))
    .filter(Boolean);
  if (missing.length) problems.push(`Missing prerequisite: ${missing.join(", ")}`);

  const credits = ctx.current.reduce((s, c) => s + c.credits, 0) + section.credits;
  if (credits > ctx.maxCredits) {
    problems.push(`This would put you at ${credits} credits; the limit is ${ctx.maxCredits}`);
  }

  for (const other of ctx.current) {
    const clash = section.meetings.some((m) => other.meetings.some((o) => meetingsOverlap(m, o)));
    if (clash) problems.push(`Time clash with ${other.courseCode}`);
  }

  return problems;
}
