"use client";

import { useEffect, useState } from "react";
import { motion, Reorder } from "framer-motion";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { Profile, Rule } from "@/lib/database.types";

export function RulesClient({ initialRules, profile, partner }: { initialRules: Rule[]; profile: Profile; partner: Profile }) {
  const supabase = createClient();
  const { push } = useToast();
  const [rules, setRules] = useState(initialRules);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const names: Record<string, string> = { [profile.id]: profile.display_name, [partner.id]: partner.display_name };

  async function refresh() {
    const { data } = await supabase.from("rules").select("*").order("order_index", { ascending: true });
    setRules(data ?? []);
  }

  useEffect(() => {
    const channel = supabase
      .channel("rules-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rules" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(rule: Rule) {
    setEditingId(rule.id);
    setDraft(rule.text);
  }

  function startAdd() {
    setEditingId("new");
    setDraft("");
  }

  async function saveEdit() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      if (editingId === "new") {
        const maxIndex = rules.reduce((m, r) => Math.max(m, r.order_index), 0);
        const { data: created } = await supabase
          .from("rules")
          .insert({ text: draft.trim(), order_index: maxIndex + 1, added_by: profile.id })
          .select()
          .single();
        if (created) {
          await logActivity(supabase, {
            actionType: "rule_added",
            description: `${profile.display_name} added a new rule.`,
            targetType: "rule",
            targetId: created.id,
          });
        }
      } else if (editingId) {
        await supabase.from("rules").update({ text: draft.trim() }).eq("id", editingId);
      }
      setEditingId(null);
      setDraft("");
      push("Saved.", "success");
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("rules").delete().eq("id", id);
    refresh();
  }

  async function handleReorder(newOrder: Rule[]) {
    setRules(newOrder);
    await Promise.all(newOrder.map((r, i) => supabase.from("rules").update({ order_index: i + 1 }).eq("id", r.id)));
  }

  return (
    <div className="dark-section min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-16">
        <PageHeader
          title="Our Rules"
          tagline="Things we want to remember."
          number="08"
          action={
            <Button onClick={startAdd}>
              <Plus className="h-4 w-4" /> Add rule
            </Button>
          }
        />

        <Reorder.Group axis="y" values={rules} onReorder={handleReorder} className="mt-8">
          {rules.map((rule, i) => (
            <Reorder.Item key={rule.id} value={rule}>
              <motion.div
                layout
                className={`group flex items-start gap-5 border-t border-border py-7 sm:gap-8 ${
                  i === rules.length - 1 ? "border-b" : ""
                }`}
              >
                <GripVertical className="mt-2 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40" />
                <span className="font-serif-display text-3xl italic text-accent sm:text-4xl">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  {editingId === rule.id ? (
                    <div className="space-y-2">
                      <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} autoFocus />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} disabled={saving || !draft.trim()}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-serif-display text-2xl leading-snug sm:text-3xl">{rule.text}</p>
                      {rule.added_by && <p className="mt-2 text-xs text-muted-foreground">Added by {names[rule.added_by] ?? "?"}</p>}
                    </>
                  )}
                </div>
                {editingId !== rule.id && (
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => startEdit(rule)} className="rounded-full p-1.5 text-muted-foreground hover:bg-foreground/5 hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(rule.id)} className="rounded-full p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {editingId === "new" && (
          <div className="mt-3 border border-border p-5">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder="A new rule…" autoFocus />
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={saveEdit} disabled={saving || !draft.trim()}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
