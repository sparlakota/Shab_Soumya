import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center animate-fade-in",
        className
      )}
    >
      {Icon && (
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          <Icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
        </div>
      )}
      <p className="font-serif-display text-lg text-foreground whitespace-pre-line">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground whitespace-pre-line">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
