"use client";

import { buttonClass } from "./ui";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button type="button" className={buttonClass("secondary")} onClick={() => window.print()}>
      {label}
    </button>
  );
}
