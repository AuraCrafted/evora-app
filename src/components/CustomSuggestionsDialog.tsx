import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import { useCustomSuggestions, customSuggestionSchema } from "@/hooks/useCustomSuggestions";
import type { Suggestion } from "@/data/suggestions";
import { sfx } from "@/lib/feedback";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const EMPTY = { emoji: "", title: "", description: "", duration: "" };

interface FieldErrors {
  emoji?: string;
  title?: string;
  description?: string;
  duration?: string;
}

export const CustomSuggestionsDialog = ({ open, onOpenChange }: Props) => {
  const { items, add, update, remove, max } = useCustomSuggestions();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Reset form when the dialog closes
  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setForm(EMPTY);
      setErrors({});
    }
  }, [open]);

  const startEdit = (s: Suggestion) => {
    sfx.tap();
    setEditingId(s.id);
    setForm({
      emoji: s.emoji,
      title: s.title,
      description: s.description === "Your own evora." ? "" : s.description,
      duration: s.duration,
    });
    setErrors({});
  };

  const cancelEdit = () => {
    sfx.tap();
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = customSuggestionSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (editingId) {
      const res = update(editingId, parsed.data);
      if (!res.ok) {
        toast({ title: "Couldn't save", description: res.error, variant: "destructive" });
        return;
      }
      sfx.accept();
      toast({ title: "Spin updated" });
    } else {
      const res = add(parsed.data);
      if (!res.ok) {
        toast({ title: "Couldn't add", description: res.error, variant: "destructive" });
        return;
      }
      sfx.accept();
      toast({ title: "Spin saved", description: "It's now in your custom pool." });
    }
    setEditingId(null);
    setForm(EMPTY);
  };

  const handleDelete = (id: string) => {
    sfx.reject();
    remove(id);
    if (editingId === id) cancelEdit();
  };

  const atLimit = items.length >= max && !editingId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Your custom evoras
          </DialogTitle>
          <DialogDescription>
            Make the dice roll your own ideas. {items.length}/{max} saved.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-3">
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <div>
              <Label htmlFor="cs-emoji" className="text-xs">Emoji</Label>
              <Input
                id="cs-emoji"
                value={form.emoji}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                placeholder="🌟"
                maxLength={8}
                className="text-center text-lg"
                aria-invalid={!!errors.emoji}
              />
            </div>
            <div>
              <Label htmlFor="cs-duration" className="text-xs">Duration</Label>
              <Input
                id="cs-duration"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="5 min"
                maxLength={20}
                aria-invalid={!!errors.duration}
              />
            </div>
          </div>
          {(errors.emoji || errors.duration) && (
            <p className="text-xs text-destructive">{errors.emoji || errors.duration}</p>
          )}

          <div>
            <Label htmlFor="cs-title" className="text-xs">Title</Label>
            <Input
              id="cs-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Stretch for a few minutes"
              maxLength={80}
              aria-invalid={!!errors.title}
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>

          <div>
            <Label htmlFor="cs-desc" className="text-xs">Description (optional)</Label>
            <Textarea
              id="cs-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="A note to remind yourself why this matters."
              maxLength={200}
              rows={2}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="hero"
              size="sm"
              className="flex-1"
              disabled={atLimit}
            >
              {editingId ? (
                <>
                  <Pencil className="h-4 w-4" /> Save changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> {atLimit ? "Limit reached" : "Add evora"}
                </>
              )}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Saved
          </h3>
          {items.length === 0 ? (
            <div className="rounded-2xl bg-secondary p-4 text-center text-sm text-muted-foreground">
              No custom evoras yet. Add your first one above.
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-2xl bg-secondary p-2.5"
                >
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-card flex items-center justify-center text-lg">
                    {s.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.title}</div>
                    <div className="text-[11px] text-muted-foreground">{s.duration}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    aria-label="Edit"
                    className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    aria-label="Delete"
                    className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-card transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
