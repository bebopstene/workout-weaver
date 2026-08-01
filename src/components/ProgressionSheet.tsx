import { useState } from "react";
import { ArrowUp } from "lucide-react";
import type { Proposal } from "@/lib/gym-store";

/**
 * Conferma degli aumenti proposti a fine allenamento.
 *
 * Gli aumenti non si applicano da soli: ogni riga si può escludere. Capita di
 * chiudere il range con una tecnica sporca, o con un peso che in realtà non era
 * quello — l'app propone, la decisione resta tua.
 */
export function ProgressionSheet({
  proposals,
  onApply,
  onDismiss,
}: {
  proposals: Proposal[];
  onApply: (keys: string[]) => void;
  onDismiss: () => void;
}) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const chosen = proposals.filter((p) => !excluded.has(p.key));

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h2 className="font-display text-2xl">Te lo sei guadagnato</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hai chiuso tutte le serie al tetto del range. Da qui si sale.
        </p>

        <div className="mt-5 space-y-2">
          {proposals.map((p) => {
            const on = !excluded.has(p.key);
            return (
              <button
                key={p.key}
                onClick={() => toggle(p.key)}
                aria-pressed={on}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  on ? "border-accent/40 bg-accent/10" : "border-border bg-background/40 opacity-60"
                }`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                    on ? "bg-accent/20 text-accent" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <ArrowUp className="size-4" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{p.description}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    on ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {on ? "Sì" : "No"}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onApply(chosen.map((p) => p.key))}
          className="mt-5 w-full rounded-lg bg-accent py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground transition-transform active:scale-[0.98]"
        >
          {chosen.length ? `Applica ${chosen.length} aumento/i` : "Non cambiare niente"}
        </button>
        <button
          onClick={onDismiss}
          className="mt-2 w-full rounded-lg border border-border py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground"
        >
          Decido dopo
        </button>
      </div>
    </div>
  );
}
