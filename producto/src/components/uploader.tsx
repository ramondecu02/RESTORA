"use client";
// Subida de fotos o PDF: comprime las fotos en el navegador (para que suban rápido desde el móvil) y las envía.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { toastError } from "./ui/toast";

type Page = { file: File; url: string | null };
const MAX_SIDE = 2200;

async function compress(f: File): Promise<File> {
  if (!f.type.startsWith("image/") || f.type === "image/gif") return f;
  try {
    const bmp = await createImageBitmap(f, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (k === 1 && f.size < 1_200_000 && (f.type === "image/jpeg" || f.type === "image/png")) return f;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * k); canvas.height = Math.round(bmp.height * k);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.84));
    if (!blob) return f;
    return new File([blob], f.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return f; // el navegador no sabe decodificarla (p. ej. HEIC fuera de Safari): se sube tal cual
  }
}

export function Uploader({ kind, cta, sample }: { kind: "albaran" | "carta"; cta: string; sample?: { url: string; name: string; title: string; sub: string }[] }) {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  useEffect(() => () => pages.forEach((p) => p.url && URL.revokeObjectURL(p.url)), [pages]);

  const add = async (list: FileList | File[] | null) => {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/") || f.type === "application/pdf" || /\.(heic|heif)$/i.test(f.name));
    if (!arr.length) { toastError("Sube una foto (JPG o PNG) o un PDF."); return; }
    const out: Page[] = [];
    for (const f of arr) {
      const c = await compress(f);
      out.push({ file: c, url: c.type.startsWith("image/") ? URL.createObjectURL(c) : null });
    }
    setPages((p) => [...p, ...out].slice(0, 10));
  };
  const send = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("kind", kind);
    files.forEach((f) => fd.append("files", f, f.name));
    try {
      const r = await fetch("/api/documentos", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) { toastError(j.error || "No se ha podido subir. Prueba otra vez."); setBusy(false); return; }
      router.push(kind === "carta" ? `/carta/subir/${j.id}` : `/compras/${j.id}`);
    } catch {
      toastError("Sin conexión. Comprueba la red y vuelve a intentarlo.");
      setBusy(false);
    }
  };
  const trySample = async (s: { url: string; name: string }) => {
    setBusy(true);
    const b = await fetch(s.url).then((r) => r.blob());
    await send([new File([b], s.name, { type: b.type || "image/jpeg" })]);
  };
  const pick = (k: string) => inputs.current[k]?.click();
  const total = pages.reduce((s, p) => s + p.file.size, 0);

  return (
    <div className="up-grid">
      <div className="stack">
        <div className="card up-card only-narrow">
          <span className="up-ill"><Icon name="camera" /></span>
          <h2 className="h2">{kind === "carta" ? "Haz una foto a tu carta" : "Haz una foto al albarán o la factura"}</h2>
          <p className="muted">Papel plano, buena luz y que se vea {kind === "carta" ? "cada precio" : "el total"}. Si tiene varias páginas, añádelas todas.</p>
          <button type="button" className="btn btn-block" onClick={() => pick("cam")} disabled={busy}><Icon name="camera" size={18} /> Hacer foto</button>
          <div className="grid2">
            <button type="button" className="btn btn-2" onClick={() => pick("gal")} disabled={busy}><Icon name="image" size={18} /> Galería</button>
            <button type="button" className="btn btn-2" onClick={() => pick("pdf")} disabled={busy}><Icon name="file" size={18} /> PDF</button>
          </div>
        </div>
        <input ref={(el) => { inputs.current.cam = el; }} className="sr" type="file" accept="image/*" capture="environment" onChange={(e) => { add(e.target.files); e.target.value = ""; }} aria-label="Hacer foto" />
        <input ref={(el) => { inputs.current.gal = el; }} className="sr" type="file" accept="image/*" multiple onChange={(e) => { add(e.target.files); e.target.value = ""; }} aria-label="Elegir fotos" />
        <input ref={(el) => { inputs.current.pdf = el; }} className="sr" type="file" accept="application/pdf" onChange={(e) => { add(e.target.files); e.target.value = ""; }} aria-label="Elegir PDF" />
        <input ref={(el) => { inputs.current.any = el; }} className="sr" id="f-any" type="file" accept="image/*,application/pdf" multiple onChange={(e) => { add(e.target.files); e.target.value = ""; }} aria-label="Elegir archivo" />
        <div className="only-wide">
          <label className={`drop ${over ? "is-over" : ""}`} htmlFor="f-any"
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}>
            <span className="drop-ic"><Icon name="upload" /></span>
            <b>Arrastra aquí la foto o el PDF</b>
            <span className="muted">o haz clic para elegir el archivo · JPG, PNG o PDF</span>
          </label>
        </div>
        {pages.length ? (
          <section className="stack-sm" aria-label="Páginas añadidas">
            <p className="lbl">{pages.length === 1 ? "1 página" : `${pages.length} páginas`} · {(total / 1024 / 1024).toLocaleString("es-ES", { maximumFractionDigits: 1 })} MB</p>
            <div className="pages">
              {pages.map((p, i) => (
                <div className="pg" key={i}>
                  {p.url ? <img src={p.url} alt={`Página ${i + 1}`} /> : <><Icon name="file" /><span>PDF</span></>}
                  <span className="pg-n">{i + 1}</span>
                  <button type="button" className="pg-x" onClick={() => setPages((x) => x.filter((_, j) => j !== i))} aria-label={`Quitar página ${i + 1}`}><Icon name="close" size={14} /></button>
                </div>
              ))}
              <button type="button" className="pg pg-add" onClick={() => pick("any")}><Icon name="plus" size={20} /><span>Otra página</span></button>
            </div>
            <button type="button" className="btn btn-block" disabled={busy} onClick={() => send(pages.map((p) => p.file))}>
              {busy ? <span className="spin" /> : null}{cta} · {pages.length === 1 ? "1 página" : `${pages.length} páginas`}
            </button>
          </section>
        ) : null}
      </div>
      <div className="stack">
        {sample?.length ? <>
          <div className="or only-narrow"><span>o</span></div>
          {sample.map((s) => (
            <button type="button" key={s.url} className="card up-sample" onClick={() => trySample(s)} disabled={busy}>
              <span className="li-ic"><Icon name="receipt" /></span><span className="li-main"><b>{s.title}</b><small>{s.sub}</small></span><Icon name="chevR" size={18} />
            </button>
          ))}
        </> : null}
        <div className="note only-wide"><Icon name="info" /><p>¿Estás en la cocina? Abre RESTORA en el móvil y haz la foto allí. Aparecerá aquí para revisarla.</p></div>
        <div className="note"><Icon name="info" /><p>{kind === "carta" ? "Leemos los platos, sus secciones y sus precios. Tú eliges cuáles crear." : "Lo leemos en unos segundos: proveedor, fecha, líneas, IVA y total. Luego solo confirmas lo dudoso."}</p></div>
      </div>
    </div>
  );
}
