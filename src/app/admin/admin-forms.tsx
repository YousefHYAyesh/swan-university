"use client";

import { ActionForm, InlineAction, SubmitButton } from "@/components/forms";
import { Field, Input, Select, Textarea } from "@/components/ui";
import {
  addRequirement,
  markMessage,
  removeRequirement,
  resetPassword,
  saveCourse,
  saveDepartment,
  saveFaculty,
  saveGradeScale,
  saveProgram,
  saveSection,
  saveSettings,
  saveStaff,
  saveTerm,
  setCurrentTerm,
  setUserActive,
} from "@/server/admin-actions";

type Opt = { id: number; label: string };

function Options({ items, placeholder }: { items: Opt[]; placeholder?: string }) {
  return (
    <>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {items.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </>
  );
}

// ---------- Users ----------

export function StaffForm({
  values,
  departments,
}: {
  values?: {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    employeeNo: string;
    title: string;
    departmentId: number | null;
    office: string | null;
    phone: string | null;
  };
  departments: Opt[];
}) {
  const v = values;
  return (
    <ActionForm action={saveStaff} className="grid gap-4 sm:grid-cols-2">
      {(e) => (
        <>
          {v && <input type="hidden" name="userId" value={v.userId} />}
          <Field label="First name" error={e.firstName}>
            <Input name="firstName" defaultValue={v?.firstName} required />
          </Field>
          <Field label="Last name" error={e.lastName}>
            <Input name="lastName" defaultValue={v?.lastName} required />
          </Field>
          <Field label="Email" error={e.email}>
            <Input name="email" type="email" defaultValue={v?.email} required />
          </Field>
          <Field label="Role" error={e.role}>
            <Select name="role" defaultValue={v?.role ?? "PROFESSOR"}>
              <option value="PROFESSOR">Professor</option>
              <option value="REGISTRAR">Registrar</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </Field>
          <Field label="Employee no." error={e.employeeNo}>
            <Input name="employeeNo" defaultValue={v?.employeeNo} required />
          </Field>
          <Field label="Title" hint="e.g. Assoc. Prof. Dr. or Registrar Officer" error={e.title}>
            <Input name="title" defaultValue={v?.title} required />
          </Field>
          <Field label="Department" error={e.departmentId}>
            <Select name="departmentId" defaultValue={v?.departmentId ?? ""}>
              <Options items={departments} placeholder="None" />
            </Select>
          </Field>
          <Field label="Office" error={e.office}>
            <Input name="office" defaultValue={v?.office ?? ""} />
          </Field>
          <Field label="Phone" error={e.phone}>
            <Input name="phone" defaultValue={v?.phone ?? ""} />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton>{v ? "Save changes" : "Create account"}</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function AccountActions({ userId, active }: { userId: number; active: boolean }) {
  return (
    <div className="space-y-3">
      <ActionForm action={setUserActive}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="active" value={String(!active)} />
        <SubmitButton
          variant={active ? "danger" : "primary"}
          confirm={active ? "Deactivate this account? The person is signed out immediately." : undefined}
        >
          {active ? "Deactivate account" : "Activate account"}
        </SubmitButton>
      </ActionForm>
      <ActionForm action={resetPassword}>
        <input type="hidden" name="userId" value={userId} />
        <SubmitButton variant="secondary" confirm="Generate a new temporary password? The old one stops working.">
          Reset password
        </SubmitButton>
      </ActionForm>
    </div>
  );
}

// ---------- Structure ----------

export function FacultyForm({ values }: { values?: { id: number; code: string; name: string } }) {
  return (
    <ActionForm action={saveFaculty} resetOnSuccess={!values} className="flex flex-wrap items-end gap-3">
      {(e) => (
        <>
          {values && <input type="hidden" name="id" value={values.id} />}
          <Field label="Code" error={e.code} className="w-28">
            <Input name="code" defaultValue={values?.code} required />
          </Field>
          <Field label="Name" error={e.name} className="min-w-56 flex-1">
            <Input name="name" defaultValue={values?.name} required />
          </Field>
          <SubmitButton variant={values ? "secondary" : "primary"}>{values ? "Save" : "Add faculty"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function DepartmentForm({ values, faculties }: { values?: { id: number; code: string; name: string; facultyId: number }; faculties: Opt[] }) {
  return (
    <ActionForm action={saveDepartment} resetOnSuccess={!values} className="flex flex-wrap items-end gap-3">
      {(e) => (
        <>
          {values && <input type="hidden" name="id" value={values.id} />}
          <Field label="Code" error={e.code} className="w-28">
            <Input name="code" defaultValue={values?.code} required />
          </Field>
          <Field label="Name" error={e.name} className="min-w-56 flex-1">
            <Input name="name" defaultValue={values?.name} required />
          </Field>
          <Field label="Faculty" error={e.facultyId} className="w-56">
            <Select name="facultyId" defaultValue={values?.facultyId ?? ""} required>
              <Options items={faculties} placeholder="Choose" />
            </Select>
          </Field>
          <SubmitButton variant={values ? "secondary" : "primary"}>{values ? "Save" : "Add department"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ProgramForm({
  values,
  departments,
}: {
  values?: {
    id: number;
    code: string;
    name: string;
    degree: string;
    departmentId: number;
    durationYears: number;
    requiredCredits: number;
    electiveCredits: number;
    minCgpa: number;
  };
  departments: Opt[];
}) {
  const v = values;
  return (
    <ActionForm action={saveProgram} className="grid gap-4 sm:grid-cols-4">
      {(e) => (
        <>
          {v && <input type="hidden" name="id" value={v.id} />}
          <Field label="Code" error={e.code}>
            <Input name="code" defaultValue={v?.code} required />
          </Field>
          <Field label="Name" error={e.name} className="sm:col-span-2">
            <Input name="name" defaultValue={v?.name} required />
          </Field>
          <Field label="Degree" error={e.degree}>
            <Select name="degree" defaultValue={v?.degree ?? "BSc"}>
              {["BSc", "BA", "MSc", "MA", "PhD"].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
          </Field>
          <Field label="Department" error={e.departmentId} className="sm:col-span-2">
            <Select name="departmentId" defaultValue={v?.departmentId ?? ""} required>
              <Options items={departments} placeholder="Choose" />
            </Select>
          </Field>
          <Field label="Years" error={e.durationYears}>
            <Input name="durationYears" type="number" defaultValue={v?.durationYears ?? 4} required />
          </Field>
          <Field label="Min CGPA to graduate" error={e.minCgpa}>
            <Input name="minCgpa" inputMode="decimal" defaultValue={v?.minCgpa ?? 2} required />
          </Field>
          <Field label="Total credits to graduate" error={e.requiredCredits}>
            <Input name="requiredCredits" type="number" defaultValue={v?.requiredCredits ?? 140} required />
          </Field>
          <Field label="Elective credits" error={e.electiveCredits}>
            <Input name="electiveCredits" type="number" defaultValue={v?.electiveCredits ?? 15} required />
          </Field>
          <div className="flex items-end sm:col-span-2">
            <SubmitButton>{v ? "Save program" : "Create program"}</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function RequirementForm({ programId, courses }: { programId: number; courses: Opt[] }) {
  return (
    <ActionForm action={addRequirement} resetOnSuccess className="flex flex-wrap items-end gap-3">
      {(e) => (
        <>
          <input type="hidden" name="programId" value={programId} />
          <Field label="Course" error={e.courseId} className="min-w-64 flex-1">
            <Select name="courseId" required defaultValue="">
              <Options items={courses} placeholder="Choose a course" />
            </Select>
          </Field>
          <Field label="Semester" error={e.semester} className="w-28">
            <Input name="semester" type="number" min={1} max={12} defaultValue={1} required />
          </Field>
          <SubmitButton>Add requirement</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function RemoveRequirement({ programId, courseId }: { programId: number; courseId: number }) {
  return <InlineAction action={removeRequirement} label="Remove" variant="ghost" hidden={{ programId, courseId }} />;
}

// ---------- Courses ----------

export function CourseForm({
  values,
  departments,
  courses,
}: {
  values?: {
    id: number;
    code: string;
    title: string;
    departmentId: number;
    credits: number;
    ects: number;
    level: number;
    description: string | null;
    isActive: boolean;
    prerequisiteIds: number[];
  };
  departments: Opt[];
  courses: Opt[];
}) {
  const v = values;
  return (
    <ActionForm action={saveCourse} className="grid gap-4 sm:grid-cols-4">
      {(e) => (
        <>
          {v && <input type="hidden" name="id" value={v.id} />}
          <Field label="Code" error={e.code}>
            <Input name="code" defaultValue={v?.code} required placeholder="SEN244" />
          </Field>
          <Field label="Title" error={e.title} className="sm:col-span-3">
            <Input name="title" defaultValue={v?.title} required />
          </Field>
          <Field label="Department" error={e.departmentId} className="sm:col-span-2">
            <Select name="departmentId" defaultValue={v?.departmentId ?? ""} required>
              <Options items={departments} placeholder="Choose" />
            </Select>
          </Field>
          <Field label="Level" error={e.level}>
            <Select name="level" defaultValue={v?.level ?? 100}>
              {[100, 200, 300, 400, 500].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Credits" error={e.credits}>
              <Input name="credits" type="number" defaultValue={v?.credits ?? 3} required />
            </Field>
            <Field label="ECTS" error={e.ects}>
              <Input name="ects" type="number" defaultValue={v?.ects ?? 5} required />
            </Field>
          </div>
          <Field label="Prerequisites" hint="Ctrl/Cmd-click to pick several." error={e.prerequisiteIds} className="sm:col-span-2">
            <select
              name="prerequisiteIds"
              multiple
              defaultValue={v?.prerequisiteIds.map(String)}
              className="h-36 w-full rounded-[var(--radius-control)] border border-line bg-white px-2 py-1 text-sm focus:border-lake focus:outline-none"
            >
              {courses
                .filter((c) => c.id !== v?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Description" error={e.description} className="sm:col-span-2">
            <Textarea name="description" defaultValue={v?.description ?? ""} className="h-36" />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="isActive" defaultChecked={v?.isActive ?? true} className="h-4 w-4 accent-lake" />
            Active (can be offered in new terms)
          </label>
          <div className="sm:col-span-2 sm:text-right">
            <SubmitButton>{v ? "Save course" : "Create course"}</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

// ---------- Terms ----------

export function TermForm({
  values,
}: {
  values?: {
    id: number;
    startYear: number;
    season: string;
    startsOn: string;
    endsOn: string;
    registrationOpensOn: string;
    registrationClosesOn: string;
    gradeDeadline: string;
  };
}) {
  const v = values;
  return (
    <ActionForm action={saveTerm} resetOnSuccess={!v} className="grid gap-4 sm:grid-cols-4">
      {(e) => (
        <>
          {v && <input type="hidden" name="id" value={v.id} />}
          <Field label="Academic year starts" error={e.startYear}>
            <Input name="startYear" type="number" defaultValue={v?.startYear ?? new Date().getFullYear()} required />
          </Field>
          <Field label="Season" error={e.season}>
            <Select name="season" defaultValue={v?.season ?? "FALL"}>
              <option value="FALL">Fall</option>
              <option value="SPRING">Spring</option>
              <option value="SUMMER">Summer</option>
            </Select>
          </Field>
          <Field label="First day" error={e.startsOn}>
            <Input name="startsOn" type="date" defaultValue={v?.startsOn} required />
          </Field>
          <Field label="Last day" error={e.endsOn}>
            <Input name="endsOn" type="date" defaultValue={v?.endsOn} required />
          </Field>
          <Field label="Registration opens" error={e.registrationOpensOn}>
            <Input name="registrationOpensOn" type="date" defaultValue={v?.registrationOpensOn} required />
          </Field>
          <Field label="Add/drop closes" error={e.registrationClosesOn}>
            <Input name="registrationClosesOn" type="date" defaultValue={v?.registrationClosesOn} required />
          </Field>
          <Field label="Grades due" error={e.gradeDeadline}>
            <Input name="gradeDeadline" type="date" defaultValue={v?.gradeDeadline} required />
          </Field>
          <div className="flex items-end">
            <SubmitButton>{v ? "Save term" : "Add term"}</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function MakeCurrent({ id }: { id: number }) {
  return (
    <InlineAction
      action={setCurrentTerm}
      label="Make current"
      hidden={{ id }}
      confirm="Make this the current term? Registration, dashboards and grading switch to it for everyone."
    />
  );
}

// ---------- Sections ----------

const DAY_OPTIONS = [
  ["1", "Monday"],
  ["2", "Tuesday"],
  ["3", "Wednesday"],
  ["4", "Thursday"],
  ["5", "Friday"],
  ["6", "Saturday"],
];

export function SectionForm({
  values,
  courses,
  terms,
  instructors,
  defaultTermId,
}: {
  values?: {
    id: number;
    courseId: number;
    termId: number;
    code: string;
    instructorId: number | null;
    capacity: number;
    room: string | null;
    status: string;
    meetings: { dayOfWeek: number; startsAt: string; endsAt: string }[];
  };
  courses: Opt[];
  terms: Opt[];
  instructors: Opt[];
  defaultTermId?: number;
}) {
  const v = values;
  return (
    <ActionForm action={saveSection} className="space-y-6">
      {(e) => (
        <>
          {v && <input type="hidden" name="id" value={v.id} />}
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Course" error={e.courseId} className="sm:col-span-2">
              <Select name="courseId" defaultValue={v?.courseId ?? ""} required>
                <Options items={courses} placeholder="Choose a course" />
              </Select>
            </Field>
            <Field label="Term" error={e.termId}>
              <Select name="termId" defaultValue={v?.termId ?? defaultTermId ?? ""} required>
                <Options items={terms} />
              </Select>
            </Field>
            <Field label="Section code" error={e.code}>
              <Input name="code" defaultValue={v?.code ?? "01"} required />
            </Field>
            <Field label="Instructor" error={e.instructorId} className="sm:col-span-2">
              <Select name="instructorId" defaultValue={v?.instructorId ?? ""}>
                <Options items={instructors} placeholder="To be announced" />
              </Select>
            </Field>
            <Field label="Capacity" error={e.capacity}>
              <Input name="capacity" type="number" defaultValue={v?.capacity ?? 30} required />
            </Field>
            <Field label="Room" error={e.room}>
              <Input name="room" defaultValue={v?.room ?? ""} />
            </Field>
            <Field label="Status" error={e.status}>
              <Select name="status" defaultValue={v?.status ?? "OPEN"}>
                <option value="OPEN">Open for registration</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink-soft">Weekly meetings</legend>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => {
                const m = v?.meetings[i];
                return (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 sm:max-w-lg">
                    <Select name={`m${i}-day`} defaultValue={m?.dayOfWeek ?? ""} aria-label={`Meeting ${i + 1} day`}>
                      <option value="">{i === 0 ? "Day" : "No other meeting"}</option>
                      {DAY_OPTIONS.map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <Input name={`m${i}-start`} type="time" defaultValue={m?.startsAt.slice(0, 5)} aria-label="Starts" className="w-32" />
                    <Input name={`m${i}-end`} type="time" defaultValue={m?.endsAt.slice(0, 5)} aria-label="Ends" className="w-32" />
                  </div>
                );
              })}
            </div>
          </fieldset>
          <SubmitButton>{v ? "Save section" : "Create section"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

// ---------- Grade scale, settings, messages ----------

export function GradeScaleForm({
  rows,
}: {
  rows: { letter: string; minPercent: number | null; points: number | null; isPassing: boolean; description: string | null }[];
}) {
  return (
    <ActionForm action={saveGradeScale}>
      <table className="w-full max-w-2xl text-sm">
        <thead className="text-left text-muted">
          <tr className="border-b border-line">
            <th className="py-2 pr-3 font-medium">Letter</th>
            <th className="py-2 pr-3 font-medium">From %</th>
            <th className="py-2 pr-3 font-medium">Points</th>
            <th className="py-2 font-medium">Meaning</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.letter} className="border-b border-line/60">
              <td className="py-2 pr-3 font-semibold">{r.letter}</td>
              <td className="py-2 pr-3">
                {r.minPercent == null ? (
                  <span className="text-muted">not score-based</span>
                ) : (
                  <Input name={`min-${r.letter}`} inputMode="decimal" defaultValue={r.minPercent} className="h-8 w-24" aria-label={`${r.letter} minimum`} />
                )}
              </td>
              <td className="py-2 pr-3">
                {r.minPercent == null ? (
                  <span className="text-muted">{r.points ?? "not counted"}</span>
                ) : (
                  <Input name={`pts-${r.letter}`} inputMode="decimal" defaultValue={r.points ?? 0} className="h-8 w-24" aria-label={`${r.letter} points`} />
                )}
              </td>
              <td className={r.isPassing || r.letter === "W" ? "py-2 text-ink-soft" : "py-2 text-danger"}>{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-5">
        <SubmitButton confirm="Save the grade scale? New approvals will use it.">Save grade scale</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function SettingsForm({ values }: { values: { universityName: string; slogan: string; about: string; maxCreditsPerTerm: number; probationBelow: number } }) {
  return (
    <ActionForm action={saveSettings} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      {(e) => (
        <>
          <Field label="University name" error={e.university_name} className="sm:col-span-2">
            <Input name="university_name" defaultValue={values.universityName} required />
          </Field>
          <Field label="Slogan" error={e.slogan} className="sm:col-span-2">
            <Input name="slogan" defaultValue={values.slogan} />
          </Field>
          <Field label="About" hint="Shown on the public home page." error={e.about} className="sm:col-span-2">
            <Textarea name="about" defaultValue={values.about} className="min-h-32" />
          </Field>
          <Field label="Credit limit per term" error={e.max_credits_per_term}>
            <Input name="max_credits_per_term" type="number" defaultValue={values.maxCreditsPerTerm} required />
          </Field>
          <Field label="Probation below CGPA" error={e.probation_below}>
            <Input name="probation_below" inputMode="decimal" defaultValue={values.probationBelow} required />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton>Save settings</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function MessageToggle({ id, read }: { id: number; read: boolean }) {
  return <InlineAction action={markMessage} label={read ? "Mark unread" : "Mark read"} variant="ghost" hidden={{ id, read: String(!read) }} />;
}
