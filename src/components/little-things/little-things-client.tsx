"use client";

import { useEffect, useState } from "react";
import { Plus, MessageCircleHeart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NoteEnvelope } from "@/components/little-things/note-envelope";
import { ComposeNoteDialog } from "@/components/little-things/compose-note-dialog";
import type { LittleThing, Profile } from "@/lib/database.types";

export function LittleThingsClient({
  initialNotes,
  profile,
  partner,
}: {
  initialNotes: LittleThing[];
  profile: Profile;
  partner: Profile;
}) {
  const supabase = createClient();
  const [notes, setNotes] = useState(initialNotes);
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [composeOpen, setComposeOpen] = useState(false);

  async function refresh() {
    const { data } = await supabase.from("little_things").select("*").order("created_at", { ascending: false });
    setNotes(data ?? []);
  }

  useEffect(() => {
    const channel = supabase
      .channel("little-things-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "little_things" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const received = notes.filter((n) => n.from_user === partner.id);
  const sent = notes.filter((n) => n.from_user === profile.id);
  const list = tab === "received" ? received : sent;

  return (
    <div className="dark-section min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <PageHeader
        title="Little Things"
        tagline="For no particular reason."
        number="07"
        action={
          <Button onClick={() => setComposeOpen(true)}>
            <Plus className="h-4 w-4" /> Leave a note
          </Button>
        }
      />

      <div className="mb-8 flex gap-2">
        <button
          onClick={() => setTab("received")}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "received" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
          }`}
        >
          For you ({received.length})
        </button>
        <button
          onClick={() => setTab("sent")}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "sent" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
          }`}
        >
          From you ({sent.length})
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={MessageCircleHeart}
          title={tab === "received" ? "Nothing here yet." : "You haven't left anything yet."}
          description={tab === "received" ? `Nothing waiting from ${partner.display_name} right now.` : "Leave a little something for later."}
          action={
            tab === "sent" && (
              <Button onClick={() => setComposeOpen(true)}>
                <Plus className="h-4 w-4" /> Leave a note
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-6 pt-2 sm:grid-cols-3">
          {list.map((note) => (
            <NoteEnvelope key={note.id} note={note} isReceived={tab === "received"} onOpened={refresh} />
          ))}
        </div>
      )}

      <ComposeNoteDialog open={composeOpen} onClose={() => setComposeOpen(false)} onSent={refresh} profile={profile} partnerName={partner.display_name} />
      </div>
    </div>
  );
}
