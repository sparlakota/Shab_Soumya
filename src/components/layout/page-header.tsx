import { ReactNode } from "react";

export function PageHeader({
  title,
  tagline,
  action,
  number,
  dark,
}: {
  title: string;
  tagline?: string;
  action?: ReactNode;
  number?: string;
  dark?: boolean;
}) {
  return (
    <div className="mb-10">
      <div className="mb-5 flex items-center justify-between">
        <p className="label-eyebrow">
          Between Us <span className="mx-1.5 opacity-40">·</span> S&amp;S
        </p>
        {number && <p className="label-eyebrow">{number}</p>}
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className={`font-serif-display text-4xl font-medium leading-[0.98] tracking-tight sm:text-5xl ${dark ? "text-foreground" : ""}`}
          >
            {title}
          </h1>
          {tagline && <p className="mt-3 max-w-md text-sm italic text-muted-foreground">{tagline}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
