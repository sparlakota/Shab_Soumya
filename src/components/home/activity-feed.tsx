import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Sparkle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ACTIVITY_LINKS } from "@/lib/activity";
import type { ActivityLogEntry } from "@/lib/database.types";

export function ActivityFeed({ items }: { items: ActivityLogEntry[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Sparkle}
        title="Nothing yet."
        description="Whatever you do next shows up here."
      />
    );
  }

  return (
    <Card className="divide-y divide-border">
      {items.map((item) => {
        const href = item.target_type ? ACTIVITY_LINKS[item.target_type] : undefined;
        const content = (
          <div className="flex items-start justify-between gap-4 px-5 py-3.5 first:rounded-t-2xl last:rounded-b-2xl">
            <p className="text-sm text-foreground/90">{item.description}</p>
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </span>
          </div>
        );
        return href ? (
          <Link key={item.id} href={href} className="block transition-colors hover:bg-black/[0.02]">
            {content}
          </Link>
        ) : (
          <div key={item.id}>{content}</div>
        );
      })}
    </Card>
  );
}
