"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WorldMap } from "@/components/world/world-map";
import { PlaceDialog } from "@/components/world/place-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PLACE_CATEGORIES, categoryMeta } from "@/lib/place-category";
import type { Place, Profile } from "@/lib/database.types";

export function WorldClient({ initialPlaces, profile }: { initialPlaces: Place[]; profile: Profile }) {
  const supabase = createClient();
  const [places, setPlaces] = useState(initialPlaces);
  const [addMode, setAddMode] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<Place | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase.from("places").select("*").order("created_at", { ascending: false });
    setPlaces(data ?? []);
  }

  useEffect(() => {
    const channel = supabase
      .channel("places-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "places" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleMapClick(lat: number, lng: number) {
    if (!addMode) return;
    setPendingLatLng({ lat, lng });
    setSelected(null);
    setDialogOpen(true);
    setAddMode(false);
  }

  function handleSelectPlace(place: Place) {
    setSelected(place);
    setPendingLatLng(null);
    setDialogOpen(true);
  }

  const filtered = filter ? places.filter((p) => p.category === filter) : places;
  const visitedCount = places.filter((p) => p.visited).length;
  const waitingCount = places.filter((p) => p.category === "want_to_go" && !p.visited).length;

  return (
    <div className="dark-section min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 sm:py-12">
        <PageHeader
          title="Our World"
          tagline="Places we've been. Places we're going."
          number="02"
          action={
            <Button
              variant={addMode ? "secondary" : "primary"}
              onClick={() => setAddMode((v) => !v)}
            >
              {addMode ? (
                <>
                  <X className="h-4 w-4" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Add place
                </>
              )}
            </Button>
          }
        />

        {addMode && (
          <p className="animate-fade-in -mt-3 flex items-center gap-1.5 text-sm text-accent">
            <MapPin className="h-3.5 w-3.5" /> Tap the map to drop a pin.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              !filter ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent-soft"
            }`}
          >
            All ({places.length})
          </button>
          {PLACE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === c.value ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent-soft"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label} ({places.filter((p) => p.category === c.value).length})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="relative h-[420px] overflow-hidden border border-border sm:h-[560px]">
            <WorldMap places={filtered} addMode={addMode} onMapClick={handleMapClick} onSelectPlace={handleSelectPlace} />
            {places.length === 0 && !addMode && (
              <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
                <div className="pointer-events-auto">
                  <EmptyState icon={MapPin} title="Where should we go next?" description="Tap “Add place”, then tap anywhere on the map to drop the first pin." />
                </div>
              </div>
            )}
          </div>
          <div className="flex max-h-[560px] flex-col">
            <div className="mb-4 border border-border p-5">
              <p className="label-eyebrow mb-3">Our World</p>
              <p className="font-serif-display text-4xl leading-none">{places.length}</p>
              <p className="mb-4 text-xs text-muted-foreground">
                {places.length === 1 ? "place" : "places"}
              </p>
              <div className="flex gap-6 border-t border-border pt-3">
                <div>
                  <p className="font-serif-display text-xl leading-none text-accent">{visitedCount}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Visited</p>
                </div>
                <div>
                  <p className="font-serif-display text-xl leading-none">{waitingCount}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Waiting</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-1 text-sm text-muted-foreground">
                  {places.length === 0 ? "No places yet." : "Nothing in this category yet."}
                </p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPlace(p)}
                    className="flex w-full items-center gap-3 border border-border bg-card p-3 text-left transition-colors hover:border-accent-soft"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryMeta(p.category).color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{categoryMeta(p.category).label}</p>
                    </div>
                    {p.visited && <Badge tone="success">Visited</Badge>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <PlaceDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSaved={refresh}
          onDeleted={refresh}
          profile={profile}
          place={selected}
          initialLatLng={pendingLatLng}
        />
      </div>
    </div>
  );
}
