import type { ReactNode } from "react";
import { Icon, Logo } from "@/components/icons";
import { AppFrame } from "@/components/ui/frame";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AppFrame>
      <div className="scr auth">
        <aside className="auth-brand">
          <div className="ab-logo"><Logo /><span>RESTORA</span></div>
          <div className="ab-mid">
            <p className="ab-eyebrow">Control de costes para cocinas</p>
            <h2 className="ab-h">Cada plato tiene un coste real. Vamos a verlo.</h2>
            <ul className="ab-list">
              <li><Icon name="camera" /><span>Una foto al albarán y los precios quedan al día.</span></li>
              <li><Icon name="book" /><span>Escandallos que se recalculan solos.</span></li>
              <li><Icon name="truck" /><span>Proveedores comparados en euros al año.</span></li>
            </ul>
          </div>
          <div className="ab-demo">
            <span className="abd-tag">Ejemplo</span>
            <div className="abd-row"><span>Albarán leído</span><b>12 líneas · 5 s</b></div>
            <div className="abd-row"><span>Aceite de oliva virgen extra</span><b>6,90 €/L</b></div>
            <div className="abd-sep" />
            <div className="abd-dish"><b>Tortilla de patatas</b><span>0,56 € por ración · food cost del 24,6 %</span></div>
          </div>
        </aside>
        <main className="auth-main">
          <div className="auth-inner">
            <div className="auth-logo"><Logo /><span>RESTORA</span></div>
            {children}
          </div>
        </main>
      </div>
    </AppFrame>
  );
}
