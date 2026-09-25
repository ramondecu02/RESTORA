// Envío de correo: Resend en producción; en desarrollo se guarda en la base (buzón /dev/correo).
import { sys } from "./db";
import { env } from "./env";

type Msg = { to: string; subject: string; text: string; html: string };

export async function sendEmail(m: Msg): Promise<boolean> {
  const provider = env.emailProvider;
  let status = "dev", error: string | null = null;
  if (provider === "resend") {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.emailFrom, to: [m.to], subject: m.subject, text: m.text, html: m.html }),
        signal: AbortSignal.timeout(10_000),
      });
      if (r.ok) status = "sent";
      else { status = "error"; error = `${r.status} ${(await r.text()).slice(0, 300)}`; }
    } catch (e) {
      status = "error"; error = String((e as Error).message || e).slice(0, 300);
    }
  } else if (!env.isProd) {
    console.log(`[correo:dev] Para ${m.to} · ${m.subject}\n${m.text}\n`);
  }
  await sys((c) => c.query(
    "insert into outbox_emails (to_email, subject, body_text, body_html, provider, status, error) values ($1,$2,$3,$4,$5,$6,$7)",
    // Con un proveedor real no guardamos el cuerpo: lleva códigos y enlaces de un solo uso
    [m.to, m.subject, provider === "dev" ? m.text : "", provider === "dev" ? m.html : "", provider, status, error]));
  if (status === "error") console.error("[correo] fallo al enviar", error);
  return status !== "error";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
function layout(title: string, body: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F5F6F3;font-family:Inter,Segoe UI,Arial,sans-serif;color:#14201A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #DCE2DC;border-radius:16px" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 28px 8px;font-weight:700;letter-spacing:.16em;font-size:14px;color:#1E3D2F">RESTORA</td></tr>
<tr><td style="padding:8px 28px 28px"><h1 style="font-size:21px;line-height:1.3;margin:0 0 12px">${esc(title)}</h1>${body}</td></tr>
</table><p style="font-size:12px;color:#8C968F;margin:16px 0 0">RESTORA · Control de costes para cocinas</p></td></tr></table></body></html>`;
}
const p = (t: string) => `<p style="font-size:15px;line-height:1.55;margin:0 0 14px;color:#34403A">${t}</p>`;
const codeBox = (code: string) => `<p style="font-size:32px;font-weight:700;letter-spacing:.3em;margin:8px 0 18px;color:#1E3D2F">${code}</p>`;
const btn = (href: string, label: string) => `<p style="margin:8px 0 18px"><a href="${esc(href)}" style="display:inline-block;background:#1E3D2F;color:#fff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:12px">${esc(label)}</a></p>`;

export function verifyEmail(name: string, code: string): Omit<Msg, "to"> {
  const first = name.split(/\s+/)[0] || "";
  return {
    subject: `${code} es tu código de RESTORA`,
    text: `Hola ${first}:\n\nTu código para confirmar el correo es ${code}. Caduca en 30 minutos.\n\nSi no has creado una cuenta en RESTORA, ignora este mensaje.`,
    html: layout("Confirma tu correo", p(`Hola ${esc(first)}, este es tu código para entrar en RESTORA:`) + codeBox(code) + p("Caduca en 30 minutos. Si no has creado una cuenta, ignora este mensaje.")),
  };
}
export function resetEmail(name: string, code: string): Omit<Msg, "to"> {
  const first = name.split(/\s+/)[0] || "";
  return {
    subject: `${code} es tu código para cambiar la contraseña`,
    text: `Hola ${first}:\n\nTu código para crear una contraseña nueva es ${code}. Caduca en 30 minutos.\n\nSi no lo has pedido tú, no hagas nada: tu contraseña sigue igual.`,
    html: layout("Cambia tu contraseña", p(`Hola ${esc(first)}, usa este código para crear una contraseña nueva:`) + codeBox(code) + p("Caduca en 30 minutos. Si no lo has pedido tú, no hagas nada: tu contraseña sigue igual.")),
  };
}
export function inviteEmail(org: string, from: string, role: string, link: string): Omit<Msg, "to"> {
  return {
    // El asunto no lleva nombres escritos por usuarios: así una invitación no sirve para mandar textos engañosos
    subject: "Te han invitado a un negocio en RESTORA",
    text: `${from} te ha invitado a unirte a ${org} en RESTORA con el rol «${role}».\n\nAcepta la invitación aquí: ${link}\n\nEl enlace caduca en 7 días.`,
    html: layout(`Te invitan a ${org}`, p(`${esc(from)} te ha invitado a unirte a <b>${esc(org)}</b> en RESTORA con el rol «${esc(role)}».`) + btn(link, "Aceptar la invitación") + p("El enlace caduca en 7 días.")),
  };
}
