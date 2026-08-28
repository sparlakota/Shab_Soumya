import type { PlaceCategory } from "@/lib/database.types";

export const PLACE_CATEGORIES: { value: PlaceCategory; label: string; color: string }[] = [
  { value: "been_here", label: "Been Here", color: "#5F7A5C" },
  { value: "want_to_go", label: "Want to Go", color: "#A87578" },
  { value: "special_place", label: "Special Place", color: "#B08830" },
  { value: "next_trip", label: "Next Trip", color: "#3B5A8A" },
];

export function categoryMeta(value: PlaceCategory) {
  return PLACE_CATEGORIES.find((c) => c.value === value) ?? PLACE_CATEGORIES[0];
}
