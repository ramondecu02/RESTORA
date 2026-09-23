"use client";
// Campo numérico que acepta coma decimal y no pelea con lo que el usuario está escribiendo.
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { parseNum } from "@/lib/format";

const show = (v: number | null | undefined, d: number) => (v == null || !Number.isFinite(v) ? "" : String(Math.round(v * 10 ** d) / 10 ** d).replace(".", ","));

export function NumInput({ value, onValue, decimals = 3, className = "inp", ...rest }: {
  value: number | null | undefined; onValue: (n: number | null) => void; decimals?: number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [txt, setTxt] = useState(show(value, decimals));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setTxt(show(value, decimals)); }, [value, decimals]);
  return (
    <input {...rest} className={className} inputMode="decimal" autoComplete="off" value={txt}
      onFocus={(e) => { focused.current = true; rest.onFocus?.(e); }}
      onBlur={(e) => { focused.current = false; setTxt(show(parseNum(txt), decimals)); rest.onBlur?.(e); }}
      onChange={(e) => { setTxt(e.target.value); onValue(parseNum(e.target.value)); }} />
  );
}
