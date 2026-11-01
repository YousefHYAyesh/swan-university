CREATE TYPE "public"."assessment_type" AS ENUM('QUIZ', 'HOMEWORK', 'LAB', 'PROJECT', 'MIDTERM', 'FINAL');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'LATE', 'ABSENT', 'EXCUSED');--> statement-breakpoint
CREATE TYPE "public"."audience" AS ENUM('ALL', 'STUDENTS', 'STAFF', 'SECTION');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('REGISTERED', 'DROPPED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."grade_status" AS ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED');--> statement-breakpoint
CREATE TYPE "public"."hold_type" AS ENUM('REGISTRATION', 'TRANSCRIPT');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."request_type" AS ENUM('ENROLLMENT_CERTIFICATE', 'TRANSCRIPT', 'GRADE_APPEAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'REGISTRAR', 'PROFESSOR', 'STUDENT');--> statement-breakpoint
CREATE TYPE "public"."season" AS ENUM('FALL', 'SPRING', 'SUMMER');--> statement-breakpoint
CREATE TYPE "public"."section_status" AS ENUM('OPEN', 'CLOSED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('ACTIVE', 'SUSPENDED', 'GRADUATED', 'WITHDRAWN');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer NOT NULL,
	"audience" "audience" NOT NULL,
	"section_id" integer,
	"title" varchar(150) NOT NULL,
	"body" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"name" varchar(80) NOT NULL,
	"type" "assessment_type" NOT NULL,
	"weight" numeric(5, 2) NOT NULL,
	"max_score" numeric(6, 2) NOT NULL,
	"due_on" date,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "assessments_weight_ck" CHECK ("assessments"."weight" > 0 and "assessments"."weight" <= 100),
	CONSTRAINT "assessments_max_ck" CHECK ("assessments"."max_score" > 0)
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"session_id" integer NOT NULL,
	"enrollment_id" integer NOT NULL,
	"status" "attendance_status" NOT NULL,
	CONSTRAINT "attendance_records_session_id_enrollment_id_pk" PRIMARY KEY("session_id","enrollment_id")
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"held_on" date NOT NULL,
	"topic" varchar(150)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer,
	"action" varchar(60) NOT NULL,
	"entity" varchar(40) NOT NULL,
	"entity_id" varchar(40),
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"email" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_prerequisites" (
	"course_id" integer NOT NULL,
	"prerequisite_id" integer NOT NULL,
	CONSTRAINT "course_prerequisites_course_id_prerequisite_id_pk" PRIMARY KEY("course_id","prerequisite_id")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"code" varchar(12) NOT NULL,
	"title" varchar(150) NOT NULL,
	"credits" smallint NOT NULL,
	"ects" smallint NOT NULL,
	"level" smallint NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "courses_code_unique" UNIQUE("code"),
	CONSTRAINT "courses_credits_ck" CHECK ("courses"."credits" between 0 and 10)
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"faculty_id" integer NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(150) NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"section_id" integer NOT NULL,
	"status" "enrollment_status" DEFAULT 'REGISTERED' NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"final_percent" numeric(5, 2),
	"letter_grade" varchar(3)
);
--> statement-breakpoint
CREATE TABLE "faculties" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(150) NOT NULL,
	CONSTRAINT "faculties_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "grade_scale" (
	"letter" varchar(3) PRIMARY KEY NOT NULL,
	"min_percent" numeric(5, 2),
	"points" numeric(3, 2),
	"counts_in_gpa" boolean DEFAULT true NOT NULL,
	"is_passing" boolean NOT NULL,
	"description" varchar(120),
	"position" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holds" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"type" "hold_type" NOT NULL,
	"reason" varchar(200) NOT NULL,
	"placed_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"ip" varchar(64),
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(150) NOT NULL,
	"degree" varchar(10) NOT NULL,
	"duration_years" smallint DEFAULT 4 NOT NULL,
	"required_credits" smallint DEFAULT 240 NOT NULL,
	CONSTRAINT "programs_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"enrollment_id" integer NOT NULL,
	"assessment_id" integer NOT NULL,
	"score" numeric(6, 2),
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scores_enrollment_id_assessment_id_pk" PRIMARY KEY("enrollment_id","assessment_id")
);
--> statement-breakpoint
CREATE TABLE "section_meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"day_of_week" smallint NOT NULL,
	"starts_at" time NOT NULL,
	"ends_at" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"term_id" integer NOT NULL,
	"code" varchar(6) NOT NULL,
	"instructor_id" integer,
	"capacity" smallint NOT NULL,
	"room" varchar(30),
	"status" "section_status" DEFAULT 'OPEN' NOT NULL,
	"grade_status" "grade_status" DEFAULT 'DRAFT' NOT NULL,
	"grades_submitted_at" timestamp with time zone,
	"grades_reviewed_by" integer,
	"grades_reviewed_at" timestamp with time zone,
	"review_note" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(60) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"employee_no" varchar(20) NOT NULL,
	"department_id" integer,
	"title" varchar(60) NOT NULL,
	"office" varchar(40),
	"phone" varchar(30),
	CONSTRAINT "staff_employee_no_unique" UNIQUE("employee_no")
);
--> statement-breakpoint
CREATE TABLE "student_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"type" "request_type" NOT NULL,
	"note" text,
	"status" "request_status" DEFAULT 'PENDING' NOT NULL,
	"handled_by" integer,
	"response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"student_no" varchar(20) NOT NULL,
	"program_id" integer NOT NULL,
	"advisor_id" integer,
	"entry_year" smallint NOT NULL,
	"status" "student_status" DEFAULT 'ACTIVE' NOT NULL,
	"date_of_birth" date,
	"gender" "gender",
	"phone" varchar(30),
	"address" text,
	"guardian_name" varchar(150),
	"guardian_phone" varchar(30),
	CONSTRAINT "students_student_no_unique" UNIQUE("student_no")
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"start_year" smallint NOT NULL,
	"season" "season" NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"registration_opens_on" date NOT NULL,
	"registration_closes_on" date NOT NULL,
	"grade_deadline" date NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"session_version" integer DEFAULT 1 NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_prerequisite_id_courses_id_fk" FOREIGN KEY ("prerequisite_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_placed_by_users_id_fk" FOREIGN KEY ("placed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_meetings" ADD CONSTRAINT "section_meetings_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_instructor_id_staff_user_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."staff"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_grades_reviewed_by_users_id_fk" FOREIGN KEY ("grades_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_requests" ADD CONSTRAINT "student_requests_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_requests" ADD CONSTRAINT "student_requests_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_advisor_id_staff_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."staff"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessments_section_idx" ON "assessments" USING btree ("section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_sessions_section_day_uq" ON "attendance_sessions" USING btree ("section_id","held_on");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_student_section_uq" ON "enrollments" USING btree ("student_id","section_id");--> statement-breakpoint
CREATE INDEX "enrollments_section_idx" ON "enrollments" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "login_attempts_email_idx" ON "login_attempts" USING btree ("email","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_course_term_code_uq" ON "sections" USING btree ("course_id","term_id","code");--> statement-breakpoint
CREATE INDEX "sections_instructor_idx" ON "sections" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "sections_term_idx" ON "sections" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "student_requests_status_idx" ON "student_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "students_program_idx" ON "students" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "students_advisor_idx" ON "students" USING btree ("advisor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "terms_year_season_uq" ON "terms" USING btree ("start_year","season");