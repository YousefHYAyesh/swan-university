"use client";

import { ActionForm, SubmitButton } from "./forms";
import { Field, Input, Select } from "./ui";
import { saveStudent } from "@/server/registrar-actions";

interface StudentFormValues {
  studentId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  studentNo?: string;
  programId?: number;
  advisorId?: number | null;
  entryYear?: number;
  status?: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  address?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
}

export function StudentForm({
  values = {},
  programs,
  advisors,
}: {
  values?: StudentFormValues;
  programs: { id: number; name: string; degree: string }[];
  advisors: { id: number; firstName: string; lastName: string; title: string }[];
}) {
  const v = values;
  return (
    <ActionForm action={saveStudent} className="space-y-8">
      {(e) => (
        <>
          {v.studentId && <input type="hidden" name="studentId" value={v.studentId} />}
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-semibold">Identity</legend>
            <Field label="First name" error={e.firstName}>
              <Input name="firstName" defaultValue={v.firstName} required />
            </Field>
            <Field label="Last name" error={e.lastName}>
              <Input name="lastName" defaultValue={v.lastName} required />
            </Field>
            <Field label="University email" error={e.email}>
              <Input name="email" type="email" defaultValue={v.email} required />
            </Field>
            <Field label="Date of birth" error={e.dateOfBirth}>
              <Input name="dateOfBirth" type="date" defaultValue={v.dateOfBirth ?? ""} />
            </Field>
            <Field label="Gender" error={e.gender}>
              <Select name="gender" defaultValue={v.gender ?? ""}>
                <option value="">Not given</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-semibold">Enrollment</legend>
            <Field label="Student no." error={e.studentNo}>
              <Input name="studentNo" defaultValue={v.studentNo} required inputMode="numeric" />
            </Field>
            <Field label="Program" error={e.programId}>
              <Select name="programId" defaultValue={v.programId ?? ""} required>
                <option value="" disabled>
                  Choose a program
                </option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.degree} {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Entry year" error={e.entryYear}>
              <Input name="entryYear" type="number" defaultValue={v.entryYear ?? new Date().getFullYear()} required />
            </Field>
            <Field label="Status" error={e.status} hint="Suspended and withdrawn students can't register for courses.">
              <Select name="status" defaultValue={v.status ?? "ACTIVE"}>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="GRADUATED">Graduated</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </Select>
            </Field>
            <Field label="Advisor" error={e.advisorId}>
              <Select name="advisorId" defaultValue={v.advisorId ?? ""}>
                <option value="">Not assigned</option>
                {advisors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} {a.firstName} {a.lastName}
                  </option>
                ))}
              </Select>
            </Field>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-semibold">Contact</legend>
            <Field label="Phone" error={e.phone}>
              <Input name="phone" defaultValue={v.phone ?? ""} />
            </Field>
            <Field label="Address" error={e.address}>
              <Input name="address" defaultValue={v.address ?? ""} />
            </Field>
            <Field label="Guardian name" error={e.guardianName}>
              <Input name="guardianName" defaultValue={v.guardianName ?? ""} />
            </Field>
            <Field label="Guardian phone" error={e.guardianPhone}>
              <Input name="guardianPhone" defaultValue={v.guardianPhone ?? ""} />
            </Field>
          </fieldset>
          <SubmitButton>{v.studentId ? "Save changes" : "Create student"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
