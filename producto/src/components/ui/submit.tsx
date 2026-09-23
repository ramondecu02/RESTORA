"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function Submit({ children, className = "btn btn-block", pendingText, disabled, name, value }: {
  children: ReactNode; className?: string; pendingText?: string; disabled?: boolean; name?: string; value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending} name={name} value={value}>
      {pending ? <><span className="spin" aria-hidden="true" />{pendingText ?? children}</> : children}
    </button>
  );
}
