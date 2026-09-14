import {
  Boxes,
  Calculator,
  Clock,
  FileText,
  LineChart,
  ShoppingCart,
  Sparkles,
  Tag,
  Truck,
  Users,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";

// String key → lucide icon, used by the copy-driven sections.
export const ICONS: Record<string, LucideIcon> = {
  cart: ShoppingCart,
  truck: Truck,
  dish: UtensilsCrossed,
  box: Boxes,
  spark: Sparkles,
  bolt: Zap,
  tag: Tag,
  file: FileText,
  users: Users,
  calc: Calculator,
  chart: LineChart,
  clock: Clock,
};
