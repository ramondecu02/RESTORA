"use client";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Icon } from "../icons";

export function Field({ label, hint, error, children, id }: { label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; id: string }) {
  return (
    <div className="fld">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="ferr" id={id + "-err"}>{error}</p> : hint ? <p className="hint" id={id + "-hint"}>{hint}</p> : null}
    </div>
  );
}

export function TextField({ label, hint, error, className = "inp", ...rest }: { label: ReactNode; hint?: ReactNode; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const id = rest.id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      <input {...rest} id={id} className={className} aria-invalid={error ? true : undefined}
        aria-describedby={error ? id + "-err" : hint ? id + "-hint" : undefined} />
    </Field>
  );
}

export function PasswordField({ label, error, hint, meter, ...rest }: { label: ReactNode; error?: string; hint?: ReactNode; meter?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const [val, setVal] = useState("");
  const auto = useId();
  const id = rest.id ?? auto;
  const s = strength(val);
  return (
    <Field label={label} error={error} hint={hint} id={id}>
      <div className="pw">
        <input {...rest} id={id} type={show ? "text" : "password"} className="inp" aria-invalid={error ? true : undefined}
          onChange={(e) => { setVal(e.target.value); rest.onChange?.(e); }} />
        <button type="button" className="iconbtn" onClick={() => setShow((x) => !x)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
          <Icon name={show ? "eyeOff" : "eye"} />
        </button>
      </div>
      {meter && val ? <div className="pwmeter" data-s={s} aria-hidden="true"><i /><i /><i /><i /></div> : null}
    </Field>
  );
}
function strength(p: string) {
  let s = 0;
  if (p.length >= 10) s++;
  if (p.length >= 14) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p) && /[^a-zA-Z0-9]/.test(p)) s++;
  return Math.max(1, s);
}
