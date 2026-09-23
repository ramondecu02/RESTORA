"use client";
import { useActionState } from "react";
import { Icon } from "@/components/icons";
import { PasswordField, TextField } from "@/components/ui/fields";
import { Submit } from "@/components/ui/submit";
import { aceptarNuevo } from "../actions";

export function InvitacionNuevoForm({ token, email }: { token: string; email: string }) {
  const [s, act] = useActionState(aceptarNuevo, undefined);
  return (
    <form className="stack" action={act} noValidate>
      {s?.error ? <div className="formerr" role="alert"><Icon name="alert" /><p>{s.error}</p></div> : null}
      <input type="hidden" name="token" value={token} />
      <TextField label="Email" value={email} readOnly />
      <TextField label="Tu nombre" name="nombre" autoComplete="name" defaultValue={s?.values?.nombre} error={s?.fields?.nombre} />
      <PasswordField label="Crea una contraseña" name="password" autoComplete="new-password" error={s?.fields?.password} hint="Mínimo 8 caracteres." meter />
      <div className="stack-sm">
        <label className="check"><input type="checkbox" name="ok" /><span>Acepto las <a className="link" href="https://restoraapp.app/es/aviso-legal" target="_blank" rel="noopener">condiciones</a> y la <a className="link" href="https://restoraapp.app/es/privacidad" target="_blank" rel="noopener">política de privacidad</a>.</span></label>
        {s?.fields?.ok ? <p className="ferr">{s.fields.ok}</p> : null}
      </div>
      <Submit pendingText="Creando tu acceso…">Aceptar la invitación</Submit>
    </form>
  );
}
