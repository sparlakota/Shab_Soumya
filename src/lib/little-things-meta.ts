import type { LittleThingCategory } from "@/lib/database.types";

export const LITTLE_THING_CATEGORIES: { value: LittleThingCategory; label: string }[] = [
  { value: "just_because", label: "Just Because" },
  { value: "open_when_miss_me", label: "Open When You Miss Me" },
  { value: "open_when_bad_day", label: "Open When You're Having a Bad Day" },
  { value: "open_when_need_motivation", label: "Open When You Need Motivation" },
  { value: "open_when_cant_sleep", label: "Open When You Can't Sleep" },
];

export function categoryLabel(value: LittleThingCategory) {
  return LITTLE_THING_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
