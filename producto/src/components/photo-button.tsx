"use client";
// Botón para cambiar la foto de un plato (con cámara en el móvil). Comprime en el navegador antes de subir.
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Icon } from "./icons";
import { toast, toastError } from "./ui/toast";

async function shrink(f: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(f, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
    return await new Promise((r) => cv.toBlob((b) => r(b ?? f), "image/jpeg", 0.85));
  } catch { return f; }
}

export function PhotoButton({ recetaId, className = "btn btn-2 btn-xs", label, children }: { recetaId: string; className?: string; label?: string; children?: ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const up = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("foto", await shrink(file), "foto.jpg");
    const r = await fetch(`/api/recetas/${recetaId}/foto`, { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { toastError(j.error || "No se ha podido subir la foto."); return; }
    toast("Foto actualizada");
    router.refresh();
  };
  return (
    <>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="sr" onChange={(e) => { up(e.target.files?.[0]); e.target.value = ""; }} aria-label="Elegir foto" />
      <button type="button" className={className} onClick={() => ref.current?.click()} disabled={busy} aria-label={label ?? "Cambiar foto"}>
        {busy ? <span className="spin" /> : children ?? <><Icon name="camera" size={16} /> Foto</>}
      </button>
    </>
  );
}
