import Image from "next/image";
import { initials } from "@/lib/utils";
import type { Profile } from "@/lib/database.types";

function Portrait({ profile, avatarUrl }: { profile: Profile; avatarUrl: string | null }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-24 w-24 overflow-hidden rounded-full border border-border shadow-[0_8px_24px_rgba(36,30,27,0.12)] sm:h-32 sm:w-32">
        {avatarUrl ? (
          <Image src={avatarUrl} alt={profile.display_name} fill sizes="128px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-accent/10 font-serif-display text-3xl italic text-accent">
            {initials(profile.display_name)}
          </div>
        )}
      </div>
      <p className="label-eyebrow">{profile.display_name}</p>
    </div>
  );
}

export function HeroConnector({
  profile,
  partner,
  avatarA,
  avatarB,
}: {
  profile: Profile;
  partner: Profile;
  avatarA: string | null;
  avatarB: string | null;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center">
      <div className="flex w-full items-center justify-center gap-6 sm:gap-10">
        <Portrait profile={profile} avatarUrl={avatarA} />
        <div className="relative flex-1">
          <div className="rule-thin" />
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-accent" />
        </div>
        <Portrait profile={partner} avatarUrl={avatarB} />
      </div>
      <p className="mt-6 text-sm italic text-muted-foreground">Somewhere between here and there.</p>
    </div>
  );
}
