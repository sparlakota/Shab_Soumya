import type { WishlistCategory, WishlistPriority, WishlistStatus } from "@/lib/database.types";

export const WISHLIST_CATEGORIES: { value: WishlistCategory; label: string }[] = [
  { value: "places", label: "Places" },
  { value: "food", label: "Food" },
  { value: "movies_shows", label: "Movies & Shows" },
  { value: "things_to_do", label: "Things to Do" },
  { value: "experiences", label: "Experiences" },
  { value: "someday", label: "Someday" },
];

export const WISHLIST_STATUSES: { value: WishlistStatus; label: string }[] = [
  { value: "to_do", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export const WISHLIST_PRIORITIES: { value: WishlistPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function categoryLabel(value: WishlistCategory) {
  return WISHLIST_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
