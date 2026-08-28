"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, MapPin, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSignedUrl } from "@/lib/storage";
import { categoryLabel } from "@/lib/wishlist-meta";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WishlistItem } from "@/lib/database.types";

const PRIORITY_TONE = { low: "muted", medium: "default", high: "accent" } as const;

export function WishlistCard({
  item,
  onClick,
  onComplete,
  onSaveToMemories,
}: {
  item: WishlistItem;
  onClick: () => void;
  onComplete: () => void;
  onSaveToMemories: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!item.image_path) return;
    const supabase = createClient();
    getSignedUrl(supabase, "world", item.image_path).then(setImageUrl);
  }, [item.image_path]);

  return (
    <Card className="flex flex-col overflow-hidden">
      {imageUrl && (
        <button onClick={onClick} className="block h-32 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" />
        </button>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Badge tone="muted">{categoryLabel(item.category)}</Badge>
          <Badge tone={PRIORITY_TONE[item.priority]}>{item.priority}</Badge>
        </div>
        <button onClick={onClick} className="text-left">
          <p className="font-serif-display text-lg leading-snug">{item.title}</p>
        </button>
        {item.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
        {item.location && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {item.location}
          </p>
        )}

        <div className="mt-auto pt-4">
          {item.status === "done" ? (
            <div className="flex items-center gap-2">
              <motion.span
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
              >
                <Check className="h-3 w-3" /> Done
              </motion.span>
              {!item.saved_to_memories && (
                <button
                  onClick={onSaveToMemories}
                  className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  <Save className="h-3 w-3" /> Save to Memories
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onComplete}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <Check className="h-3.5 w-3.5" /> Mark complete
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
