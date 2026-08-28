"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Film } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSignedUrl } from "@/lib/storage";
import type { Memory, MemoryMedia } from "@/lib/database.types";

export type MemoryWithMedia = Memory & { memory_media: MemoryMedia[] };

export function MemoryCard({ memory, onClick }: { memory: MemoryWithMedia; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const first = memory.memory_media[0];

  useEffect(() => {
    if (!first) return;
    const supabase = createClient();
    getSignedUrl(supabase, "memories", first.storage_path).then(setUrl);
  }, [first]);

  return (
    <button onClick={onClick} className="group mb-3 block w-full break-inside-avoid text-left">
      <div className="relative overflow-hidden border border-border bg-card">
        <div className="relative w-full overflow-hidden bg-border/20">
          {url && first?.media_type === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={memory.caption ?? ""}
              className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          )}
          {url && first?.media_type === "video" && (
            <>
              <video src={url} className="aspect-[4/5] h-auto w-full object-cover" muted />
              <div className="absolute right-2 top-2 rounded-full bg-black/50 p-1">
                <Film className="h-3 w-3 text-white" />
              </div>
            </>
          )}
          {!url && <div className="aspect-[4/5] w-full animate-pulse bg-border/30" />}
          {memory.memory_media.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
              +{memory.memory_media.length - 1}
            </span>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent p-3 pt-8">
            {memory.caption && (
              <p className="truncate font-serif-display text-sm italic text-white">{memory.caption}</p>
            )}
            <p className="text-[10px] uppercase tracking-wide text-white/70">
              {format(new Date(memory.memory_date), "MMM yyyy")}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
