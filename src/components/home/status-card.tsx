import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import type { Profile } from "@/lib/database.types";

export function StatusCard({ profile, avatarUrl, isYou }: { profile: Profile; avatarUrl: string | null; isYou: boolean }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <Avatar src={avatarUrl} name={profile.display_name} size={44} online={profile.is_online} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {profile.display_name}
          {isYou && <span className="text-muted-foreground"> (you)</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {profile.is_online ? "Online" : "Offline"}
          {profile.status ? ` · ${profile.status}` : ""}
        </p>
      </div>
    </Card>
  );
}
