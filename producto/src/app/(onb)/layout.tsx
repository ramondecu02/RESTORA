import type { ReactNode } from "react";
import { AppFrame } from "@/components/ui/frame";
export default function OnbLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
