"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Mail, MailOpen, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSignedUrl } from "@/lib/storage";
import { categoryLabel } from "@/lib/little-things-meta";
import type { LittleThing } from "@/lib/database.types";

function rotationFor(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (hash % 7) - 3; // -3deg to 3deg
}

export function NoteEnvelope({ note, isReceived, onOpened }: { note: LittleThing; isReceived: boolean; onOpened: () => void }) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const locked = note.reveal_at ? new Date(note.reveal_at) > new Date() : false;
  const rotation = rotationFor(note.id);

  useEffect(() => {
    if (!open || !note.image_path) return;
    const supabase = createClient();
    getSignedUrl(supabase, "little-things", note.image_path).then(setImageUrl);
  }, [open, note.image_path]);

  async function handleOpen() {
    if (locked) return;
    setOpen(true);
    if (isReceived && !note.opened_at) {
      const supabase = createClient();
      await supabase.from("little_things").update({ opened_at: new Date().toISOString() }).eq("id", note.id);
      onOpened();
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={locked}
        style={{ transform: `rotate(${rotation}deg)` }}
        className={`group block w-full text-left transition-all duration-200 hover:z-10 hover:scale-[1.03] hover:rotate-0 disabled:cursor-not-allowed ${
          locked ? "opacity-50" : ""
        }`}
      >
        <div className="relative bg-card p-4 pt-5 text-foreground shadow-[0_6px_16px_rgba(74,20,32,0.25)]">
          <span className="absolute -top-1.5 left-1/2 h-3 w-8 -translate-x-1/2 rotate-1 bg-border/80" />
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
            {locked ? (
              <Clock className="h-3.5 w-3.5 text-accent" />
            ) : note.opened_at ? (
              <MailOpen className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Mail className="h-3.5 w-3.5 text-accent" />
            )}
          </div>
          <p className="font-serif-display text-base italic leading-snug">{categoryLabel(note.category)}</p>
          <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            {locked ? `Opens ${format(new Date(note.reveal_at!), "MMM d, h:mm a")}` : format(new Date(note.created_at), "MMM d")}
          </p>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a0a10]/55 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateX: -10 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm border border-border bg-card p-6 shadow-xl"
            >
              <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-accent">
                {categoryLabel(note.category)}
              </p>
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="mb-4 w-full object-cover" />
              )}
              <p className="text-center font-serif-display text-xl italic leading-relaxed">{note.message}</p>
              <p className="mt-4 text-center text-xs text-muted-foreground">{format(new Date(note.created_at), "MMMM d, yyyy")}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
