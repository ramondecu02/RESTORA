"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/types";

const LEVELS = ["#2f9e56", "#2f6fb5", "#7a3fc4"];

type L = {
  albaran: string;
  today: string;
  oil: string;
  flour: string;
  tomato: string;
  cod: string;
  updated: string;
  foodcost: string;
  week: string;
  target: string;
  ranking: string;
  dishes: [string, string, string];
  escandallo: string;
  ingredients: [string, string, string];
  costPlate: string;
  pvp: string;
  margin: string;
};

const LABELS: Record<Locale, L> = {
  es: {
    albaran: "ALBARÁN · DISTRIB. CAMP",
    today: "HOY",
    oil: "Aceite oliva V.E.",
    flour: "Harina T45",
    tomato: "Tomate rama",
    cod: "Bacalao",
    updated: "PMP actualizado · alerta enviada",
    foodcost: "FOOD COST",
    week: "SEMANA 37",
    target: "objetivo 30%",
    ranking: "Aportación al margen",
    dishes: ["Bravas", "Croquetas", "Ensalada"],
    escandallo: "ESCANDALLO · BRAVAS",
    ingredients: ["Patata agria", "Aceite oliva", "Pimentón + alioli"],
    costPlate: "Coste plato",
    pvp: "PVP",
    margin: "Margen",
  },
  ca: {
    albaran: "ALBARÀ · DISTRIB. CAMP",
    today: "AVUI",
    oil: "Oli oliva V.E.",
    flour: "Farina T45",
    tomato: "Tomàquet rama",
    cod: "Bacallà",
    updated: "PMP actualitzat · alerta enviada",
    foodcost: "FOOD COST",
    week: "SETMANA 37",
    target: "objectiu 30%",
    ranking: "Aportació al marge",
    dishes: ["Braves", "Croquetes", "Amanida"],
    escandallo: "ESCANDALL · BRAVES",
    ingredients: ["Patata agra", "Oli oliva", "Pebre + allioli"],
    costPlate: "Cost plat",
    pvp: "PVP",
    margin: "Marge",
  },
};

const mono = "var(--font-mono)";

function ScreenHeader({ text, right }: { text: string; right?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontFamily: mono,
        fontSize: 9.5,
        letterSpacing: "0.06em",
        color: "var(--muted)",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
      {right && <span>{right}</span>}
    </div>
  );
}

function ComprasScreen({ l }: { l: L }) {
  const rows: [string, string, boolean][] = [
    [l.oil, "2,21 €/L", true],
    [l.flour, "0,74 €/kg", false],
    [l.tomato, "1,90 €/kg", false],
    [l.cod, "9,40 €/kg", false],
  ];
  return (
    <>
      <ScreenHeader text={l.albaran} right={l.today} />
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
        {rows.map(([name, price, hot]) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "9px 10px",
              borderRadius: 9,
              background: hot ? "var(--brand-soft)" : "var(--bg)",
              border: hot ? "1px solid var(--brand)" : "1px solid var(--hair)",
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>{name}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: hot ? "var(--brand)" : "var(--ink)" }}>
                {price}
              </span>
              {hot && (
                <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: "var(--brand)" }}>▲ +14%</span>
              )}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 12,
          fontFamily: mono,
          fontSize: 10,
          color: LEVELS[0],
          background: `color-mix(in srgb, ${LEVELS[0]} 12%, transparent)`,
          padding: "7px 10px",
          borderRadius: 999,
          textAlign: "center",
        }}
      >
        ✓ {l.updated}
      </div>
    </>
  );
}

function VentasScreen({ l }: { l: L }) {
  const dishes: [string, number][] = [
    [l.dishes[0], 78],
    [l.dishes[1], 64],
    [l.dishes[2], 41],
  ];
  return (
    <>
      <ScreenHeader text={`${l.foodcost} · ${l.week}`} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
        <span style={{ fontFamily: mono, fontWeight: 600, fontSize: 40, color: LEVELS[1], lineHeight: 1 }}>31,4%</span>
        <span style={{ fontFamily: mono, fontSize: 10.5, color: "var(--muted)" }}>{l.target}</span>
      </div>
      <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.06em", color: "var(--muted)", textTransform: "uppercase", margin: "16px 0 8px" }}>
        {l.ranking}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {dishes.map(([name, pct]) => (
          <div key={name}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
              <span style={{ fontWeight: 500 }}>{name}</span>
              <span style={{ fontFamily: mono, color: "var(--muted)" }}>{pct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "var(--hair)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: LEVELS[1] }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function EscandallosScreen({ l }: { l: L }) {
  const ings: [string, string][] = [
    [l.ingredients[0], "0,42 €"],
    [l.ingredients[1], "0,38 €"],
    [l.ingredients[2], "0,32 €"],
  ];
  return (
    <>
      <ScreenHeader text={l.escandallo} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
        {ings.map(([name, cost]) => (
          <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 2px", borderBottom: "1px solid var(--hair)" }}>
            <span style={{ fontWeight: 500 }}>{name}</span>
            <span style={{ fontFamily: mono, color: "var(--muted)" }}>{cost}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, borderRadius: 10, border: `1px solid ${LEVELS[2]}`, background: `color-mix(in srgb, ${LEVELS[2]} 10%, transparent)`, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
          <span style={{ color: "var(--muted)" }}>{l.costPlate}</span>
          <span style={{ fontFamily: mono, fontWeight: 600 }}>1,12 €</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginTop: 4 }}>
          <span style={{ color: "var(--muted)" }}>{l.pvp}</span>
          <span style={{ fontFamily: mono, fontWeight: 600 }}>6,50 €</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--hair)" }}>
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{l.margin}</span>
          <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 20, color: LEVELS[2] }}>82,8%</span>
        </div>
      </div>
    </>
  );
}

export function Showcase({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const [active, setActive] = useState(0);
  const l = LABELS[locale];
  const steps = dict.ladder.steps;
  const color = LEVELS[active];

  const screens = [<ComprasScreen key="c" l={l} />, <VentasScreen key="v" l={l} />, <EscandallosScreen key="e" l={l} />];

  return (
    <section id="showcase" className="mx-auto max-w-[1200px]" style={{ padding: "64px 28px" }}>
      <div className="masthead">
        <span className="masthead-kicker">◆ {dict.sec.showcase}</span>
        <div className="masthead-rule" />
      </div>
      <h2
        className="display"
        style={{ fontWeight: 800, fontSize: "clamp(32px, 5.4vw, 58px)", lineHeight: 0.96, margin: "20px 0 0" }}
      >
        {dict.showcase.title}
      </h2>
      <p style={{ fontSize: 18, color: "var(--muted)", margin: "14px 0 0", maxWidth: "48ch" }}>{dict.showcase.sub}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 40,
          alignItems: "center",
          marginTop: 40,
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, order: 1 }}>
          {steps.map((step, i) => {
            const on = i === active;
            const c = LEVELS[i];
            return (
              <button
                key={step.name}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={on}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  background: "var(--surface)",
                  border: on ? `2px solid ${c}` : "1px solid var(--hair)",
                  borderRadius: 16,
                  padding: "18px 20px",
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  transition: "border-color .2s ease, transform .2s ease",
                  transform: on ? "translateX(4px)" : "none",
                }}
              >
                <span
                  className="display"
                  style={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    borderRadius: 10,
                    background: on ? c : `color-mix(in srgb, ${c} 14%, transparent)`,
                    color: on ? "#fff" : c,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 17,
                  }}
                >
                  {`N${i + 1}`}
                </span>
                <span>
                  <span className="display" style={{ display: "block", fontWeight: 800, fontSize: 21, lineHeight: 1 }}>
                    {step.name}
                  </span>
                  <span style={{ display: "block", fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>{step.desc}</span>
                </span>
              </button>
            );
          })}
          <p className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {dict.showcase.hint} ↑
          </p>
        </div>

        {/* Phone mockup */}
        <div style={{ order: 2, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: 300,
              maxWidth: "100%",
              borderRadius: 40,
              padding: 12,
              background: "var(--ink)",
              boxShadow: "0 40px 80px -40px rgba(30,33,26,0.6)",
            }}
          >
            <div
              style={{
                borderRadius: 30,
                background: "var(--surface)",
                overflow: "hidden",
                border: "1px solid var(--hair)",
              }}
            >
              {/* status bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 18px 10px",
                  borderBottom: "1px solid var(--hair)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, transition: "background .3s ease" }} />
                  <span className="display" style={{ fontWeight: 800, fontSize: 15, letterSpacing: "0.03em" }}>RESTORA</span>
                </div>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{dict.showcase.caption}</span>
              </div>
              {/* screen */}
              <div key={active} style={{ padding: 18, minHeight: 320, animation: "revealIn .4s ease both" }}>
                {screens[active]}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 34, textAlign: "center" }}>
        <a href="#lead" className="btn btn-brand" style={{ padding: "14px 26px", fontSize: 16 }}>
          {dict.nav.cta} →
        </a>
      </div>
    </section>
  );
}
