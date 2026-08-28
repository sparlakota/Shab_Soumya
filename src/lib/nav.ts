import {
  Home,
  Gamepad2,
  Map,
  ListChecks,
  Images,
  Trophy,
  HeartHandshake,
  MessageCircleHeart,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  tagline: string;
  icon: LucideIcon;
  number: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", tagline: "Our little corner of the internet.", icon: Home, number: "00" },
  { href: "/play", label: "Play", tagline: "Things we can do together.", icon: Gamepad2, number: "01" },
  { href: "/world", label: "Our World", tagline: "Places we've been. Places we'll go.", icon: Map, number: "02" },
  { href: "/wishlist", label: "Wishlist", tagline: "All the things we want to do.", icon: ListChecks, number: "03" },
  { href: "/memories", label: "Memories", tagline: "Moments we never want to forget.", icon: Images, number: "04" },
  { href: "/scoreboard", label: "Scoreboard", tagline: "Let the games begin.", icon: Trophy, number: "05" },
  { href: "/fights", label: "Our Fights", tagline: "Understand. Repair. Move forward.", icon: HeartHandshake, number: "06" },
  { href: "/little-things", label: "Little Things", tagline: "Notes for your heart.", icon: MessageCircleHeart, number: "07" },
  { href: "/rules", label: "Our Rules", tagline: "The way we choose us. Every day.", icon: ScrollText, number: "08" },
];
