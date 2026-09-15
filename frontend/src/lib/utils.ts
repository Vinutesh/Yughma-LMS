import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// A small fixed hue set (not a random full-spectrum hash) so a deterministic
// "pick a color for this thing" placeholder — a course thumbnail, a person's
// avatar — stays legible against both themes and never lands on a hue that
// clashes with the semantic status colors (success/warning/danger/info)
// used elsewhere. Shared by Avatar and any content-thumbnail placeholder so
// the same hashing rule produces the same visual language everywhere.
const PALETTE_HUES = [222, 262, 292, 12, 152, 192, 42, 332];

export function hueForSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE_HUES[Math.abs(hash) % PALETTE_HUES.length];
}

export function gradientForSeed(seed: string): string {
  const hue = hueForSeed(seed);
  return `linear-gradient(135deg, hsl(${hue} 65% 45%), hsl(${hue + 25} 70% 38%))`;
}
