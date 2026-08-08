import type { ProjectDraft } from "~/lib/calculator-types";
import { printDraftMinutes } from "~/lib/calculator-types";

export type ProjectFieldErrors = {
  projectName?: string;
  printName?: string;
  customerEmail?: string;
};

/** Empty email is allowed; non-empty must look like an email. */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function validateProjectForSave(project: ProjectDraft): {
  errors: ProjectFieldErrors;
  warnings: string[];
} {
  const errors: ProjectFieldErrors = {};
  const warnings: string[] = [];

  if (!project.name.trim()) {
    errors.projectName = "Project name is required.";
  }

  const blankPrint = project.prints.findIndex((p) => !p.name.trim());
  if (blankPrint >= 0) {
    errors.printName = `Print ${blankPrint + 1} needs a name.`;
  }

  if (project.customer.name.trim() && !isValidEmail(project.customer.email)) {
    errors.customerEmail = "Enter a valid email address.";
  }

  for (let i = 0; i < project.prints.length; i++) {
    const p = project.prints[i]!;
    const label = p.name.trim() || `Print ${i + 1}`;
    if (printDraftMinutes(p) <= 0) {
      warnings.push(`${label} has no print time.`);
    }
    const hasQty = p.materials.some((m) => Number(m.quantity) > 0);
    if (!hasQty) {
      warnings.push(`${label} has no material quantity.`);
    }
  }

  return { errors, warnings };
}

export function validateCustomerEmail(email: string): string | null {
  if (!isValidEmail(email)) return "Enter a valid email address.";
  return null;
}
