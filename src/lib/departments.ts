/**
 * Department list for the UI (icons included).
 *
 * The canonical data lives in `./departments-data` so the Express server can
 * import it without pulling `lucide-react` into the runtime bundle. This file
 * only attaches the icon components for the browser.
 */
import {
  Factory,
  ShoppingCart,
  Megaphone,
  Calculator,
  Users,
  Code2,
  Wrench,
  Truck,
  ShieldCheck,
  HardHat,
  FlaskConical,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import {
  DEPARTMENTS_DATA,
  getDepartmentData,
  type DepartmentData,
  type DepartmentIconName,
} from './departments-data';

export type { DepartmentData, DepartmentIconName };
export { DEPARTMENTS_DATA, getDepartmentData };

export interface DepartmentDef {
  id: string;
  name: string;
  hint: string; // short hint used in AI prompts and card subtitle
  icon: LucideIcon;
  accent: string; // tailwind-ish static classes for the card icon chip
}

const ICONS: Record<DepartmentIconName, LucideIcon> = {
  Factory,
  ShoppingCart,
  Megaphone,
  Calculator,
  Users,
  Code2,
  Wrench,
  Truck,
  ShieldCheck,
  HardHat,
  FlaskConical,
  LayoutGrid,
};

/**
 * Fixed department list for Seilaneh Sabz Holding.
 * The AI generates job-specific criteria/questions; this list is the stable
 * navigation and talent-bank grouping backbone.
 */
export const DEPARTMENTS: DepartmentDef[] = DEPARTMENTS_DATA.map((d) => ({
  id: d.id,
  name: d.name,
  hint: d.hint,
  accent: d.accent,
  icon: ICONS[d.iconName] || LayoutGrid,
}));

export function getDepartment(id: string): DepartmentDef {
  const data = getDepartmentData(id);
  return (
    DEPARTMENTS.find((d) => d.id === data.id) || DEPARTMENTS[DEPARTMENTS.length - 1]
  );
}
