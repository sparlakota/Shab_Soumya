import type { FightFeeling, FightNeed, FightStatus } from "@/lib/database.types";

export const FEELINGS: FightFeeling[] = [
  "Hurt",
  "Angry",
  "Sad",
  "Anxious",
  "Ignored",
  "Disappointed",
  "Misunderstood",
  "Insecure",
  "Overwhelmed",
  "Other",
];

export const NEEDS: FightNeed[] = [
  "Reassurance",
  "Understanding",
  "Space",
  "Communication",
  "Appreciation",
  "Clarity",
  "Time",
  "Other",
];

export const STATUS_META: Record<FightStatus, { label: string; tone: "warning" | "accent" | "success" }> = {
  unresolved: { label: "Unresolved", tone: "warning" },
  discussing: { label: "Discussing", tone: "accent" },
  resolved: { label: "Resolved", tone: "success" },
};
