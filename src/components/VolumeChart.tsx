type Day = { label: string; volume: number; isToday: boolean };

export function VolumeChart({ days, delta }: { days: Day[]; delta: number | null }) {
  const max = Math.max(1, ...days.map((d) => d.volume));

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Volume settimanale
        </h2>
        {delta !== null && (
          <span className={`text-xs font-medium ${delta >= 0 ? "text-accent" : "text-destructive"}`}>
            {delta >= 0 ? "+" : ""}
            {delta}% vs scorsa
          </span>
        )}
      </div>
      <div className="flex h-16 items-end gap-1.5">
        {days.map((d) => {
          const h = d.volume ? Math.max(8, (d.volume / max) * 100) : 8;
          return (
            <div
              key={d.label}
              className={`flex-1 rounded-sm transition-[height] duration-500 ${
                d.isToday ? "bg-accent" : d.volume ? "bg-secondary" : "bg-secondary/30"
              }`}
              style={{ height: `${h}%` }}
              title={`${d.label}: ${Math.round(d.volume).toLocaleString("it-IT")} kg`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        {days.map((d) => (
          <span
            key={d.label}
            className={`flex-1 text-center text-[9px] font-bold uppercase ${
              d.isToday ? "text-accent" : "text-muted-foreground"
            }`}
          >
            {d.label}
          </span>
        ))}
      </div>
    </section>
  );
}