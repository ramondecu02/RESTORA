"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { PasswordField, TextField } from "@/components/ui/fields";
import { Submit } from "@/components/ui/submit";
import { toast } from "@/components/ui/toast";
import { codeBoxInput } from "@/lib/code-box";
import { cambiarEmail, crearNegocio, entrar, recuperar, reenviarCodigo, registrar, restablecer, verificar, type FormState } from "./actions";

const SITE = "https://restoraapp.app";

function FormError({ s }: { s: FormState }) {
  if (!s?.error) return null;
  return <div className="formerr" role="alert"><Icon name="alert" /><p>{s.error}</p></div>;
}

export function RegistroForm() {
  const [s, act] = useActionState(registrar, undefined);
  const v = s?.values ?? {}, e = s?.fields ?? {};
  return (
    <form className="stack" action={act} noValidate>
      <FormError s={s} />
      <TextField label="Tu nombre" name="nombre" autoComplete="name" placeholder="Nombre y apellidos" defaultValue={v.nombre} error={e.nombre} required />
      <TextField label="Email de trabajo" name="email" type="email" inputMode="email" autoComplete="email" placeholder="tu@restaurante.com" defaultValue={v.email} error={e.email} required />
      <TextField label="Nombre del restaurante" name="restaurante" autoComplete="organization" placeholder="Ej.: Bar La Plaza" defaultValue={v.restaurante} error={e.restaurante} required />
      <PasswordField label="Contraseña" name="password" autoComplete="new-password" error={e.password} hint="Mínimo 8 caracteres." meter required />
      <div className="stack-sm">
        <label className="check"><input type="checkbox" name="ok" aria-invalid={e.ok ? true : undefined} />
          <span>Acepto las <a className="link" href={`${SITE}/es/aviso-legal`} target="_blank" rel="noopener">condiciones</a> y la <a className="link" href={`${SITE}/es/privacidad`} target="_blank" rel="noopener">política de privacidad</a>.</span>
        </label>
        {e.ok ? <p className="ferr">{e.ok}</p> : null}
      </div>
      <Submit pendingText="Creando tu cuenta…">Crear cuenta</Submit>
      <p className="hint center">Te enviaremos un código de 6 cifras para confirmar tu email. Sin tarjeta.</p>
    </form>
  );
}

export function EntrarForm({ next, email }: { next?: string; email?: string }) {
  const [s, act] = useActionState(entrar, undefined);
  return (
    <form className="stack" action={act} noValidate>
      <FormError s={s} />
      <input type="hidden" name="next" value={next ?? ""} />
      <TextField label="Email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="tu@restaurante.com" defaultValue={s?.values?.email ?? email} required />
      <PasswordField label="Contraseña" name="password" autoComplete="current-password" required />
      <Submit pendingText="Entrando…">Entrar</Submit>
    </form>
  );
}

export function CodeInput({ name, autoFocus }: { name: string; autoFocus?: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const setAll = (text: string, from = 0) => {
    const clean = text.replace(/\D/g, "").slice(0, 6 - from).split("");
    setDigits((d) => { const n = [...d]; clean.forEach((c, i) => { n[from + i] = c; }); return n; });
    const nextIdx = Math.min(5, from + clean.length);
    refs.current[nextIdx]?.focus();
  };
  return (
    <div className="code" role="group" aria-label="Código de verificación">
      <input type="hidden" name={name} value={digits.join("")} />
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} className="code-i" inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Cifra ${i + 1} de 6`} value={d} autoFocus={autoFocus && i === 0} maxLength={6}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const r = codeBoxInput(d, e.target.value, (e.nativeEvent as InputEvent).data);
            if ("spread" in r) return setAll(r.spread, i);
            setDigits((x) => { const n = [...x]; n[i] = r.digit; return n; });
            if (r.digit && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus(); }}
          onPaste={(e) => { e.preventDefault(); setAll(e.clipboardData.getData("text"), 0); }} />
      ))}
    </div>
  );
}

export function VerificarForm({ email, changed, next }: { email: string; changed?: boolean; next?: string }) {
  const [s, act] = useActionState(verificar, undefined);
  const [rs, resend, resending] = useActionState(reenviarCodigo, undefined);
  const [left, setLeft] = useState(45);
  const [edit, setEdit] = useState(false);
  useEffect(() => { if (changed) toast("Email cambiado. Te hemos enviado un código nuevo."); }, [changed]);
  useEffect(() => { if (rs?.ok) { toast(rs.ok); setLeft(55); } }, [rs]);
  useEffect(() => { const t = setInterval(() => setLeft((x) => (x > 0 ? x - 1 : 0)), 1000); return () => clearInterval(t); }, []);
  return (
    <>
      <span className="mailic"><Icon name="mail" size={28} /></span>
      <div className="auth-head"><h1>Confirma tu email</h1><p>Hemos enviado un código de 6 cifras a <b>{email}</b>. Caduca en 30 minutos.</p></div>
      <form className="stack" action={act} noValidate>
        <FormError s={s} />
        <input type="hidden" name="next" value={next ?? ""} />
        <CodeInput name="code" autoFocus />
        <Submit pendingText="Comprobando…">Verificar</Submit>
      </form>
      <div className="stack-sm center">
        <form action={resend}>
          <button className="linkbtn" type="submit" style={{ justifyContent: "center", width: "100%" }} disabled={left > 0 || resending}>
            {left > 0 ? `Reenviar código en 0:${String(left).padStart(2, "0")}` : "Reenviar código"}
          </button>
        </form>
        {rs?.error ? <p className="ferr">{rs.error}</p> : null}
        <button className="linkbtn" type="button" style={{ justifyContent: "center" }} onClick={() => setEdit((x) => !x)}>¿Email equivocado? Cambiarlo</button>
        {edit ? <CambiarEmailForm email={email} next={next} /> : null}
      </div>
      <div className="note"><Icon name="info" /><p>Hasta confirmar el email no se pueden subir documentos ni invitar a nadie. Mira también en la carpeta de spam.</p></div>
    </>
  );
}
function CambiarEmailForm({ email, next }: { email: string; next?: string }) {
  const [s, act] = useActionState(cambiarEmail, undefined);
  return (
    <form className="stack-sm" action={act} noValidate style={{ textAlign: "left" }}>
      <FormError s={s} />
      <input type="hidden" name="next" value={next ?? ""} />
      <TextField label="Email correcto" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={s?.values?.email ?? email} error={s?.fields?.email} />
      <Submit className="btn btn-2 btn-block" pendingText="Guardando…">Guardar y enviar código</Submit>
    </form>
  );
}

export function RecuperarForm({ email }: { email?: string }) {
  const [s, act] = useActionState(recuperar, undefined);
  return (
    <form className="stack" action={act} noValidate>
      <FormError s={s} />
      <TextField label="Email de tu cuenta" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={s?.values?.email ?? email} error={s?.fields?.email} required />
      <Submit pendingText="Enviando…">Enviarme un código</Submit>
    </form>
  );
}

export function RestablecerForm({ email }: { email: string }) {
  const [s, act] = useActionState(restablecer, undefined);
  return (
    <form className="stack" action={act} noValidate>
      <FormError s={s} />
      <input type="hidden" name="email" value={email} />
      <div className="fld"><span className="lbl">Código de 6 cifras</span><CodeInput name="code" autoFocus />{s?.fields?.code ? <p className="ferr">{s.fields.code}</p> : null}</div>
      <PasswordField label="Contraseña nueva" name="password" autoComplete="new-password" error={s?.fields?.password} hint="Mínimo 8 caracteres. Cerraremos la sesión en los demás dispositivos." meter />
      <Submit pendingText="Guardando…">Cambiar contraseña y entrar</Submit>
      <p className="auth-alt"><Link className="link" href={`/recuperar?email=${encodeURIComponent(email)}`}>Pedir otro código</Link></p>
    </form>
  );
}

export function CrearNegocioForm() {
  const [s, act] = useActionState(crearNegocio, undefined);
  return (
    <form className="stack" action={act} noValidate>
      <FormError s={s} />
      <TextField label="Nombre del restaurante" name="restaurante" autoComplete="organization" error={s?.fields?.restaurante} defaultValue={s?.values?.restaurante} />
      <Submit pendingText="Creando…">Crear mi negocio</Submit>
    </form>
  );
}
