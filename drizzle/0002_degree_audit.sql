CREATE TABLE "program_requirements" (
	"program_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"semester" smallint NOT NULL,
	CONSTRAINT "program_requirements_program_id_course_id_pk" PRIMARY KEY("program_id","course_id")
);
--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "elective_credits" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "min_cgpa" numeric(3, 2) DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "program_requirements" ADD CONSTRAINT "program_requirements_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_requirements" ADD CONSTRAINT "program_requirements_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;