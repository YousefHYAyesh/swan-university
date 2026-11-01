export const REQUEST_TYPE: Record<string, string> = {
  ENROLLMENT_CERTIFICATE: "Enrollment certificate",
  TRANSCRIPT: "Official transcript",
  GRADE_APPEAL: "Grade appeal",
  OTHER: "Other",
};

export const REQUEST_STATUS: Record<string, { label: string; tone: "neutral" | "amber" | "ok" | "danger" | "lake" }> = {
  PENDING: { label: "Pending", tone: "amber" },
  IN_PROGRESS: { label: "In progress", tone: "lake" },
  COMPLETED: { label: "Completed", tone: "ok" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  REGISTRAR: "Registrar",
  PROFESSOR: "Professor",
  STUDENT: "Student",
};

export const GRADE_STATUS: Record<string, { label: string; tone: "neutral" | "amber" | "ok" | "danger" | "lake" }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SUBMITTED: { label: "Submitted", tone: "amber" },
  APPROVED: { label: "Approved", tone: "ok" },
  RETURNED: { label: "Returned for changes", tone: "danger" },
};

export const ASSESSMENT_TYPE: Record<string, string> = {
  QUIZ: "Quiz",
  HOMEWORK: "Homework",
  LAB: "Lab",
  PROJECT: "Project",
  MIDTERM: "Midterm",
  FINAL: "Final exam",
};
