"use client";

import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";
import type { Place } from "@/lib/database.types";

const WorldMapInner = dynamic(() => import("./world-map-inner").then((m) => m.WorldMapInner), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-border/40" />,
});

export function WorldMap(props: {
  places: Place[];
  onSelectPlace: (place: Place) => void;
}) {
  return <WorldMapInner {...props} />;
}
