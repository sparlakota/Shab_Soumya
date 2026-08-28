import {
  Sparkles,
  SplitSquareHorizontal,
  Fingerprint,
  Paintbrush,
  Layers,
  Dice5,
  Flame,
  Trophy,
  Brain,
  Zap,
  Heart,
  Gamepad2,
  Sparkle,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  SplitSquareHorizontal,
  Fingerprint,
  Paintbrush,
  Layers,
  Dice5,
  Flame,
  Trophy,
  Brain,
  Zap,
  Heart,
  Gamepad2,
};

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? Sparkle;
}
