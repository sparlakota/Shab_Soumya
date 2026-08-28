import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <Card className="animate-fade-slide-up p-4 sm:p-5">
      <Icon className="mb-3 h-4 w-4 text-accent" strokeWidth={1.75} />
      <p className="font-serif-display text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}
