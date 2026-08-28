import Image from "next/image";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  src,
  name,
  size = 40,
  online,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full rounded-full object-cover border border-border"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full border border-border bg-accent/10 font-serif-display text-accent"
          style={{ fontSize: size * 0.38 }}
        >
          {initials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-background",
            online ? "bg-success" : "bg-muted-foreground/50"
          )}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
