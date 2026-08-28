"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { FEELINGS, NEEDS, STATUS_META } from "@/lib/fight-meta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { Fight, FightPerspective, FightResolution, Profile } from "@/lib/database.types";

export function FightDetailClient({
  initialFight,
  initialPerspectives,
  initialResolutions,
  profile,
  partner,
}: {
  initialFight: Fight;
  initialPerspectives: FightPerspective[];
  initialResolutions: FightResolution[];
  profile: Profile;
  partner: Profile;
}) {
  const supabase = createClient();
  const { push } = useToast();
  const [fight, setFight] = useState(initialFight);
  const [perspectives, setPerspectives] = useState(initialPerspectives);
  const [resolutions, setResolutions] = useState(initialResolutions);

  const [feelings, setFeelings] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);
  const [perspectiveText, setPerspectiveText] = useState("");
  const [otherGuess, setOtherGuess] = useState("");
  const [submittingPerspective, setSubmittingPerspective] = useState(false);

  const [whatToDo, setWhatToDo] = useState(fight.what_to_do_differently ?? "");
  const [whatLearned, setWhatLearned] = useState(fight.what_we_learned ?? "");
  const [savingReflection, setSavingReflection] = useState(false);

  const [heard, setHeard] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [knowNext, setKnowNext] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const refresh = useCallback(async () => {
    const [{ data: f }, { data: p }, { data: r }] = await Promise.all([
      supabase.from("fights").select("*").eq("id", fight.id).single(),
      supabase.from("fight_perspectives").select("*").eq("fight_id", fight.id),
      supabase.from("fight_resolutions").select("*").eq("fight_id", fight.id),
    ]);
    if (f) setFight(f);
    setPerspectives(p ?? []);
    setResolutions(r ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fight.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`fight-${fight.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fight_perspectives", filter: `fight_id=eq.${fight.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "fight_resolutions", filter: `fight_id=eq.${fight.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "fights", filter: `id=eq.${fight.id}` }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fight.id]);

  const myPerspective = perspectives.find((p) => p.user_id === profile.id);
  const partnerPerspective = perspectives.find((p) => p.user_id === partner.id);
  const myResolution = resolutions.find((r) => r.user_id === profile.id);
  const partnerResolution = resolutions.find((r) => r.user_id === partner.id);
  const bothSubmitted = !!myPerspective && !!partnerPerspective;
  const isResolved = fight.status === "resolved";

  async function submitPerspective() {
    if (!perspectiveText.trim()) return;
    setSubmittingPerspective(true);
    try {
      await supabase.from("fight_perspectives").insert({
        fight_id: fight.id,
        user_id: profile.id,
        feelings,
        needs,
        perspective: perspectiveText.trim(),
        other_perspective_guess: otherGuess || null,
      });
      if (fight.status === "unresolved") {
        await supabase.from("fights").update({ status: "discussing" }).eq("id", fight.id);
      }
      push("Perspective shared.", "success");
      refresh();
    } catch {
      push("Couldn't save your perspective. Try again.", "error");
    } finally {
      setSubmittingPerspective(false);
    }
  }

  async function saveReflection() {
    setSavingReflection(true);
    try {
      await supabase
        .from("fights")
        .update({ what_to_do_differently: whatToDo || null, what_we_learned: whatLearned || null })
        .eq("id", fight.id);
      push("Saved.", "success");
      refresh();
    } finally {
      setSavingReflection(false);
    }
  }

  async function confirmResolution() {
    if (!heard || !understood || !knowNext) return;
    setConfirming(true);
    try {
      await supabase.from("fight_resolutions").upsert(
        {
          fight_id: fight.id,
          user_id: profile.id,
          felt_heard: heard,
          understood_perspective: understood,
          know_next_steps: knowNext,
        },
        { onConflict: "fight_id,user_id" }
      );

      const { data: allResolutions } = await supabase.from("fight_resolutions").select("*").eq("fight_id", fight.id);
      const hasBoth = (allResolutions ?? []).some((r) => r.user_id === profile.id) && (allResolutions ?? []).some((r) => r.user_id === partner.id);
      if (hasBoth) {
        await supabase.from("fights").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", fight.id);
        await logActivity(supabase, {
          actionType: "fight_resolved",
          description: `Fight #${fight.fight_number} was marked resolved.`,
          targetType: "fight",
          targetId: fight.id,
        });
      }
      push("Confirmed.", "success");
      refresh();
    } finally {
      setConfirming(false);
    }
  }

  const sharedFeelings = myPerspective && partnerPerspective ? myPerspective.feelings.filter((f) => partnerPerspective.feelings.includes(f)) : [];
  const sharedNeeds = myPerspective && partnerPerspective ? myPerspective.needs.filter((n) => partnerPerspective.needs.includes(n)) : [];

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/fights" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Our Fights
      </Link>

      <div className="mb-8 flex items-start justify-between gap-3 border-b border-border pb-6">
        <div>
          <p className="label-eyebrow mb-2">Fight #{fight.fight_number}</p>
          <h1 className="font-serif-display text-4xl font-medium leading-[0.98]">{fight.title}</h1>
        </div>
        <Badge tone={STATUS_META[fight.status].tone}>{isResolved ? "Resolved 💚" : STATUS_META[fight.status].label}</Badge>
      </div>

      {(fight.what_happened || fight.actual_issue) && (
        <div className="mb-8 space-y-4 border border-border p-5">
          {fight.what_happened && (
            <div>
              <p className="label-eyebrow mb-1">What happened</p>
              <p className="text-sm">{fight.what_happened}</p>
            </div>
          )}
          {fight.actual_issue && (
            <div>
              <p className="label-eyebrow mb-1">The actual issue</p>
              <p className="text-sm">{fight.actual_issue}</p>
            </div>
          )}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PerspectiveCard name={`${profile.display_name}'s perspective`} perspective={myPerspective} isMine />
        <PerspectiveCard name={`${partner.display_name}'s perspective`} perspective={partnerPerspective} isMine={false} />
      </div>

      {!myPerspective && !isResolved && (
        <div className="mb-8 border border-border p-5">
          <p className="mb-4 font-serif-display text-2xl">Your perspective</p>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">How did I feel?</Label>
              <ChipSelect options={FEELINGS} selected={feelings} onChange={setFeelings} />
            </div>
            <div>
              <Label className="mb-2 block">What did I need?</Label>
              <ChipSelect options={NEEDS} selected={needs} onChange={setNeeds} />
            </div>
            <div className="space-y-1.5">
              <Label>My perspective</Label>
              <Textarea value={perspectiveText} onChange={(e) => setPerspectiveText(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>What do I think their perspective might be? (optional)</Label>
              <Textarea value={otherGuess} onChange={(e) => setOtherGuess(e.target.value)} rows={2} />
            </div>
            <Button className="w-full" onClick={submitPerspective} disabled={submittingPerspective || !perspectiveText.trim()}>
              {submittingPerspective ? "Sharing…" : "Share my perspective"}
            </Button>
          </div>
        </div>
      )}

      {bothSubmitted && (
        <div className="mb-8 border border-border p-5">
          <p className="mb-3 font-serif-display text-2xl">Where we agree</p>
          {sharedFeelings.length === 0 && sharedNeeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing overlapping yet — that&apos;s okay.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {[...sharedFeelings, ...sharedNeeds].map((tag) => (
                <Badge key={tag} tone="success">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <p className="mb-3 mt-5 font-serif-display text-2xl">Where we see it differently</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-wrap gap-1.5">
              {myPerspective!.feelings.concat(myPerspective!.needs).filter((t) => !sharedFeelings.includes(t) && !sharedNeeds.includes(t)).map((t) => (
                <Badge key={t} tone="muted">
                  {t}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {partnerPerspective!.feelings.concat(partnerPerspective!.needs).filter((t) => !sharedFeelings.includes(t) && !sharedNeeds.includes(t)).map((t) => (
                <Badge key={t} tone="muted">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs italic text-muted-foreground">Not about who&apos;s right. Just about seeing the full picture.</p>
        </div>
      )}

      <div className="mb-8 space-y-4 border border-border p-5">
        <div className="space-y-1.5">
          <Label>What can we do differently next time?</Label>
          <Textarea value={whatToDo} onChange={(e) => setWhatToDo(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>What did we learn?</Label>
          <Textarea value={whatLearned} onChange={(e) => setWhatLearned(e.target.value)} rows={2} />
        </div>
        <Button variant="outline" onClick={saveReflection} disabled={savingReflection}>
          {savingReflection ? "Saving…" : "Save"}
        </Button>
      </div>

      {!isResolved && (
        <div className="border border-border p-5">
          <p className="mb-1 font-serif-display text-2xl">Ready to close this one?</p>
          <p className="mb-4 text-sm text-muted-foreground">
            {partnerResolution ? `${partner.display_name} has confirmed.` : `Waiting for ${partner.display_name}.`}
          </p>
          {myResolution ? (
            <p className="text-sm text-success">You&apos;ve confirmed. Waiting on {partner.display_name}.</p>
          ) : (
            <div className="space-y-3">
              <Checkbox label="I feel heard." checked={heard} onChange={setHeard} />
              <Checkbox label="I understand their perspective." checked={understood} onChange={setUnderstood} />
              <Checkbox label="We know what we'll do differently." checked={knowNext} onChange={setKnowNext} />
              <Button className="w-full" onClick={confirmResolution} disabled={confirming || !heard || !understood || !knowNext}>
                Confirm
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PerspectiveCard({ name, perspective, isMine }: { name: string; perspective?: FightPerspective; isMine: boolean }) {
  return (
    <div className="border border-border p-5">
      <p className="label-eyebrow mb-2">{name}</p>
      {perspective ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {perspective.feelings.map((f) => (
              <Badge key={f} tone="accent">
                {f}
              </Badge>
            ))}
          </div>
          <p className="text-sm">{perspective.perspective}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{isMine ? "Not shared yet." : "Waiting for them to share."}</p>
      )}
    </div>
  );
}

function ChipSelect({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            onClick={() => onChange(active ? selected.filter((s) => s !== opt) : [...selected, opt])}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent-soft"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-accent-soft"
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
          checked ? "border-accent bg-accent text-accent-foreground" : "border-border"
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}
