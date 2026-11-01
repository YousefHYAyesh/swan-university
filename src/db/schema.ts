import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["ADMIN", "REGISTRAR", "PROFESSOR", "STUDENT"]);
export const genderEnum = pgEnum("gender", ["MALE", "FEMALE", "OTHER"]);
export const studentStatusEnum = pgEnum("student_status", [
  "ACTIVE",
  "SUSPENDED",
  "GRADUATED",
  "WITHDRAWN",
]);
export const seasonEnum = pgEnum("season", ["FALL", "SPRING", "SUMMER"]);
export const sectionStatusEnum = pgEnum("section_status", ["OPEN", "CLOSED", "CANCELLED"]);
// Lifecycle of a section's grades: professor drafts, submits; registrar approves or returns.
export const gradeStatusEnum = pgEnum("grade_status", [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "RETURNED",
]);
export const assessmentTypeEnum = pgEnum("assessment_type", [
  "QUIZ",
  "HOMEWORK",
  "LAB",
  "PROJECT",
  "MIDTERM",
  "FINAL",
]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "REGISTERED",
  "DROPPED",
  "WITHDRAWN",
]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PRESENT",
  "LATE",
  "ABSENT",
  "EXCUSED",
]);
export const audienceEnum = pgEnum("audience", ["ALL", "STUDENTS", "STAFF", "SECTION"]);
export const requestTypeEnum = pgEnum("request_type", [
  "ENROLLMENT_CERTIFICATE",
  "TRANSCRIPT",
  "GRADE_APPEAL",
  "OTHER",
]);
export const requestStatusEnum = pgEnum("request_status", [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
]);
export const holdTypeEnum = pgEnum("hold_type", ["REGISTRATION", "TRANSCRIPT"]);
export const notificationKindEnum = pgEnum("notification_kind", [
  "GRADE",
  "REQUEST",
  "HOLD",
  "ATTENDANCE",
  "REGISTRATION",
  "ANNOUNCEMENT",
  "FINANCE",
]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---------- People ----------

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  // Bumped on password change or deactivation so old session cookies stop working.
  sessionVersion: integer("session_version").notNull().default(1),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const faculties = pgTable("faculties", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  facultyId: integer("faculty_id")
    .notNull()
    .references(() => faculties.id),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  degree: varchar("degree", { length: 10 }).notNull(),
  durationYears: smallint("duration_years").notNull().default(4),
  requiredCredits: smallint("required_credits").notNull().default(240),
  electiveCredits: smallint("elective_credits").notNull().default(0),
  minCgpa: numeric("min_cgpa", { precision: 3, scale: 2, mode: "number" }).notNull().default(2),
});

// Courses every student in the program must pass, by recommended semester.
export const programRequirements = pgTable(
  "program_requirements",
  {
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    semester: smallint("semester").notNull(),
  },
  (t) => [primaryKey({ columns: [t.programId, t.courseId] })],
);

export const staff = pgTable("staff", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  employeeNo: varchar("employee_no", { length: 20 }).notNull().unique(),
  departmentId: integer("department_id").references(() => departments.id),
  title: varchar("title", { length: 60 }).notNull(),
  office: varchar("office", { length: 40 }),
  phone: varchar("phone", { length: 30 }),
});

export const students = pgTable(
  "students",
  {
    userId: integer("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    studentNo: varchar("student_no", { length: 20 }).notNull().unique(),
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id),
    advisorId: integer("advisor_id").references(() => staff.userId, { onDelete: "set null" }),
    entryYear: smallint("entry_year").notNull(),
    status: studentStatusEnum("status").notNull().default("ACTIVE"),
    dateOfBirth: date("date_of_birth"),
    gender: genderEnum("gender"),
    phone: varchar("phone", { length: 30 }),
    address: text("address"),
    guardianName: varchar("guardian_name", { length: 150 }),
    guardianPhone: varchar("guardian_phone", { length: 30 }),
  },
  (t) => [index("students_program_idx").on(t.programId), index("students_advisor_idx").on(t.advisorId)],
);

// ---------- Catalog & calendar ----------

export const terms = pgTable(
  "terms",
  {
    id: serial("id").primaryKey(),
    startYear: smallint("start_year").notNull(),
    season: seasonEnum("season").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    registrationOpensOn: date("registration_opens_on").notNull(),
    registrationClosesOn: date("registration_closes_on").notNull(),
    gradeDeadline: date("grade_deadline").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
  },
  (t) => [uniqueIndex("terms_year_season_uq").on(t.startYear, t.season)],
);

export const courses = pgTable(
  "courses",
  {
    id: serial("id").primaryKey(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id),
    code: varchar("code", { length: 12 }).notNull().unique(),
    title: varchar("title", { length: 150 }).notNull(),
    credits: smallint("credits").notNull(),
    ects: smallint("ects").notNull(),
    level: smallint("level").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [check("courses_credits_ck", sql`${t.credits} between 0 and 10`)],
);

export const coursePrerequisites = pgTable(
  "course_prerequisites",
  {
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    prerequisiteId: integer("prerequisite_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.prerequisiteId] })],
);

export const sections = pgTable(
  "sections",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id),
    termId: integer("term_id")
      .notNull()
      .references(() => terms.id),
    code: varchar("code", { length: 6 }).notNull(),
    instructorId: integer("instructor_id").references(() => staff.userId, { onDelete: "set null" }),
    capacity: smallint("capacity").notNull(),
    room: varchar("room", { length: 30 }),
    status: sectionStatusEnum("status").notNull().default("OPEN"),
    gradeStatus: gradeStatusEnum("grade_status").notNull().default("DRAFT"),
    gradesSubmittedAt: timestamp("grades_submitted_at", { withTimezone: true }),
    gradesReviewedBy: integer("grades_reviewed_by").references(() => users.id),
    gradesReviewedAt: timestamp("grades_reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
  },
  (t) => [
    uniqueIndex("sections_course_term_code_uq").on(t.courseId, t.termId, t.code),
    index("sections_instructor_idx").on(t.instructorId),
    index("sections_term_idx").on(t.termId),
  ],
);

export const sectionMeetings = pgTable("section_meetings", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id")
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  dayOfWeek: smallint("day_of_week").notNull(), // 1 = Monday
  startsAt: time("starts_at").notNull(),
  endsAt: time("ends_at").notNull(),
});

// ---------- Grading ----------

export const assessments = pgTable(
  "assessments",
  {
    id: serial("id").primaryKey(),
    sectionId: integer("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    type: assessmentTypeEnum("type").notNull(),
    weight: numeric("weight", { precision: 5, scale: 2, mode: "number" }).notNull(),
    maxScore: numeric("max_score", { precision: 6, scale: 2, mode: "number" }).notNull(),
    dueOn: date("due_on"),
    position: smallint("position").notNull().default(0),
  },
  (t) => [
    index("assessments_section_idx").on(t.sectionId),
    check("assessments_weight_ck", sql`${t.weight} > 0 and ${t.weight} <= 100`),
    check("assessments_max_ck", sql`${t.maxScore} > 0`),
  ],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.userId, { onDelete: "cascade" }),
    sectionId: integer("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    status: enrollmentStatusEnum("status").notNull().default("REGISTERED"),
    registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
    // Filled when the registrar approves the section's grades.
    finalPercent: numeric("final_percent", { precision: 5, scale: 2, mode: "number" }),
    letterGrade: varchar("letter_grade", { length: 3 }),
  },
  (t) => [
    uniqueIndex("enrollments_student_section_uq").on(t.studentId, t.sectionId),
    index("enrollments_section_idx").on(t.sectionId),
  ],
);

export const scores = pgTable(
  "scores",
  {
    enrollmentId: integer("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    score: numeric("score", { precision: 6, scale: 2, mode: "number" }),
    updatedBy: integer("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.enrollmentId, t.assessmentId] })],
);

export const gradeScale = pgTable("grade_scale", {
  letter: varchar("letter", { length: 3 }).primaryKey(),
  minPercent: numeric("min_percent", { precision: 5, scale: 2, mode: "number" }),
  points: numeric("points", { precision: 3, scale: 2, mode: "number" }),
  countsInGpa: boolean("counts_in_gpa").notNull().default(true),
  isPassing: boolean("is_passing").notNull(),
  description: varchar("description", { length: 120 }),
  position: smallint("position").notNull(),
});

// ---------- Attendance ----------

export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    id: serial("id").primaryKey(),
    sectionId: integer("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    heldOn: date("held_on").notNull(),
    topic: varchar("topic", { length: 150 }),
  },
  (t) => [uniqueIndex("attendance_sessions_section_day_uq").on(t.sectionId, t.heldOn)],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    sessionId: integer("session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),
    enrollmentId: integer("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    status: attendanceStatusEnum("status").notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.enrollmentId] })],
);

// ---------- Communication & services ----------

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  audience: audienceEnum("audience").notNull(),
  sectionId: integer("section_id").references(() => sections.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 150 }).notNull(),
  body: text("body").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: createdAt(),
});

export const studentRequests = pgTable(
  "student_requests",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.userId, { onDelete: "cascade" }),
    type: requestTypeEnum("type").notNull(),
    note: text("note"),
    status: requestStatusEnum("status").notNull().default("PENDING"),
    handledBy: integer("handled_by").references(() => users.id),
    response: text("response"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("student_requests_status_idx").on(t.status)],
);

export const holds = pgTable("holds", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.userId, { onDelete: "cascade" }),
  type: holdTypeEnum("type").notNull(),
  reason: varchar("reason", { length: 200 }).notNull(),
  placedBy: integer("placed_by")
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const settings = pgTable("settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: jsonb("value").notNull(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 60 }).notNull(),
    entity: varchar("entity", { length: 40 }).notNull(),
    entityId: varchar("entity_id", { length: 40 }),
    details: jsonb("details"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    ip: varchar("ip", { length: 64 }),
    success: boolean("success").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("login_attempts_email_idx").on(t.email, t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKindEnum("kind").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    link: varchar("link", { length: 300 }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt)],
);

// ---------- Relations ----------

export const usersRelations = relations(users, ({ one }) => ({
  student: one(students, { fields: [users.id], references: [students.userId] }),
  staff: one(staff, { fields: [users.id], references: [staff.userId] }),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, { fields: [students.userId], references: [users.id] }),
  program: one(programs, { fields: [students.programId], references: [programs.id] }),
  advisor: one(staff, { fields: [students.advisorId], references: [staff.userId] }),
  enrollments: many(enrollments),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  user: one(users, { fields: [staff.userId], references: [users.id] }),
  department: one(departments, { fields: [staff.departmentId], references: [departments.id] }),
  sections: many(sections),
}));

export const programsRelations = relations(programs, ({ one, many }) => ({
  department: one(departments, { fields: [programs.departmentId], references: [departments.id] }),
  requirements: many(programRequirements),
}));

export const programRequirementsRelations = relations(programRequirements, ({ one }) => ({
  program: one(programs, { fields: [programRequirements.programId], references: [programs.id] }),
  course: one(courses, { fields: [programRequirements.courseId], references: [courses.id] }),
}));

export const facultiesRelations = relations(faculties, ({ many }) => ({
  departments: many(departments),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  faculty: one(faculties, { fields: [departments.facultyId], references: [faculties.id] }),
  programs: many(programs),
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  department: one(departments, { fields: [courses.departmentId], references: [departments.id] }),
  sections: many(sections),
  prerequisites: many(coursePrerequisites, { relationName: "course" }),
}));

export const coursePrerequisitesRelations = relations(coursePrerequisites, ({ one }) => ({
  course: one(courses, {
    fields: [coursePrerequisites.courseId],
    references: [courses.id],
    relationName: "course",
  }),
  prerequisite: one(courses, {
    fields: [coursePrerequisites.prerequisiteId],
    references: [courses.id],
  }),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  course: one(courses, { fields: [sections.courseId], references: [courses.id] }),
  term: one(terms, { fields: [sections.termId], references: [terms.id] }),
  instructor: one(staff, { fields: [sections.instructorId], references: [staff.userId] }),
  meetings: many(sectionMeetings),
  assessments: many(assessments),
  enrollments: many(enrollments),
}));

export const sectionMeetingsRelations = relations(sectionMeetings, ({ one }) => ({
  section: one(sections, { fields: [sectionMeetings.sectionId], references: [sections.id] }),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  section: one(sections, { fields: [assessments.sectionId], references: [sections.id] }),
  scores: many(scores),
}));

export const enrollmentsRelations = relations(enrollments, ({ one, many }) => ({
  student: one(students, { fields: [enrollments.studentId], references: [students.userId] }),
  section: one(sections, { fields: [enrollments.sectionId], references: [sections.id] }),
  scores: many(scores),
}));

export const scoresRelations = relations(scores, ({ one }) => ({
  enrollment: one(enrollments, { fields: [scores.enrollmentId], references: [enrollments.id] }),
  assessment: one(assessments, { fields: [scores.assessmentId], references: [assessments.id] }),
}));

export const studentRequestsRelations = relations(studentRequests, ({ one }) => ({
  student: one(students, { fields: [studentRequests.studentId], references: [students.userId] }),
}));

export const holdsRelations = relations(holds, ({ one }) => ({
  student: one(students, { fields: [holds.studentId], references: [students.userId] }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(users, { fields: [announcements.authorId], references: [users.id] }),
  section: one(sections, { fields: [announcements.sectionId], references: [sections.id] }),
}));

export type Role = (typeof roleEnum.enumValues)[number];

export const attendanceSessionsRelations = relations(attendanceSessions, ({ one, many }) => ({
  section: one(sections, { fields: [attendanceSessions.sectionId], references: [sections.id] }),
  records: many(attendanceRecords),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  session: one(attendanceSessions, { fields: [attendanceRecords.sessionId], references: [attendanceSessions.id] }),
  enrollment: one(enrollments, { fields: [attendanceRecords.enrollmentId], references: [enrollments.id] }),
}));
