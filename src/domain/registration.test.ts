import { describe, expect, it } from "vitest";
import {
  meetingsOverlap,
  registrationProblems,
  type RegistrationContext,
  type SectionForRegistration,
} from "./registration";

const section: SectionForRegistration = {
  id: 10,
  courseId: 5,
  courseCode: "SEN244",
  credits: 4,
  status: "OPEN",
  capacity: 30,
  enrolledCount: 12,
  meetings: [{ dayOfWeek: 2, startsAt: "10:00", endsAt: "11:50" }],
  prerequisiteIds: [3],
  prerequisiteCodes: ["SEN122"],
};

const ctx: RegistrationContext = {
  today: "2025-09-10",
  window: { opensOn: "2025-09-01", closesOn: "2025-09-20" },
  studentStatus: "ACTIVE",
  hasRegistrationHold: false,
  passedCourseIds: new Set([3]),
  completed: new Map([[3, "BB"]]),
  current: [],
  maxCredits: 22,
};

describe("registrationProblems", () => {
  it("allows a valid registration", () => {
    expect(registrationProblems(section, ctx)).toEqual([]);
  });

  it("blocks outside the registration window", () => {
    expect(registrationProblems(section, { ...ctx, today: "2025-09-21" })).toContain(
      "Registration is closed for this term",
    );
  });

  it("blocks full sections", () => {
    expect(registrationProblems({ ...section, enrolledCount: 30 }, ctx)).toContain("This section is full");
  });

  it("names the missing prerequisite", () => {
    expect(registrationProblems(section, { ...ctx, passedCourseIds: new Set() })).toContain(
      "Missing prerequisite: SEN122",
    );
  });

  it("blocks students with a hold", () => {
    expect(registrationProblems(section, { ...ctx, hasRegistrationHold: true })[0]).toMatch(/hold/);
  });

  it("enforces the credit limit", () => {
    const current = [{ courseId: 1, courseCode: "MAT251", credits: 20, meetings: [] }];
    expect(registrationProblems(section, { ...ctx, current }).join()).toMatch(/24 credits/);
  });

  it("detects a timetable clash", () => {
    const current = [
      { courseId: 1, courseCode: "MAT253", credits: 3, meetings: [{ dayOfWeek: 2, startsAt: "11:00", endsAt: "12:50" }] },
    ];
    expect(registrationProblems(section, { ...ctx, current })).toContain("Time clash with MAT253");
  });

  it("blocks taking the same course twice in a term", () => {
    const current = [{ courseId: 5, courseCode: "SEN244", credits: 4, meetings: [] }];
    expect(registrationProblems(section, { ...ctx, current }).join()).toMatch(/already registered/);
  });
});

describe("retakes", () => {
  it("blocks retaking a course passed with a good grade", () => {
    const passedIt = { ...ctx, passedCourseIds: new Set([3, 5]), completed: new Map([[3, "BB"], [5, "CB"]]) };
    expect(registrationProblems(section, passedIt)).toContain("You already passed SEN244 with CB");
  });
  it("allows retaking a conditional pass to improve it", () => {
    const conditional = { ...ctx, passedCourseIds: new Set([3, 5]), completed: new Map([[3, "BB"], [5, "DD"]]) };
    expect(registrationProblems(section, conditional)).toEqual([]);
  });
  it("allows retaking a failed course", () => {
    const failedIt = { ...ctx, completed: new Map([[3, "BB"], [5, "FF"]]) };
    expect(registrationProblems(section, failedIt)).toEqual([]);
  });
});

describe("meetingsOverlap", () => {
  it("treats back-to-back classes as no clash", () => {
    expect(
      meetingsOverlap(
        { dayOfWeek: 1, startsAt: "09:00", endsAt: "10:00" },
        { dayOfWeek: 1, startsAt: "10:00", endsAt: "11:00" },
      ),
    ).toBe(false);
  });
  it("ignores different days", () => {
    expect(
      meetingsOverlap(
        { dayOfWeek: 1, startsAt: "09:00", endsAt: "10:00" },
        { dayOfWeek: 2, startsAt: "09:00", endsAt: "10:00" },
      ),
    ).toBe(false);
  });
});
