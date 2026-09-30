"use client";
import { DAY_NAMES, type WeekHours } from "@/src/lib/hours";
import { Switch } from "./ui/switch";
import { cn } from "@/src/lib/utils";

/** Weekly opening hours (Kinshasa time). Monday first for display. */
export function HoursEditor({ value, onChange }: { value: WeekHours; onChange: (h: WeekHours) => void }) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const set = (i: number, patch: Partial<WeekHours[number]>) => onChange(value.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white" data-testid="hours-editor">
      {order.map((i) => {
        const d = value[i];
        const overnight = !d.closed && d.close <= d.open;
        return (
          <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" data-day={i}>
            <div className="flex w-36 items-center gap-3">
              <Switch checked={!d.closed} onChange={(v) => set(i, { closed: !v })} label={`${DAY_NAMES[i]} ouvert`} />
              <span className={cn("font-medium", d.closed && "text-gray-400")}>{DAY_NAMES[i]}</span>
            </div>
            {d.closed ? (
              <span className="text-sm text-gray-500">Fermé toute la journée</span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input type="time" aria-label={`${DAY_NAMES[i]} ouverture`} value={d.open} step={900} onChange={(e) => set(i, { open: e.target.value })} className="h-10 rounded-lg border border-gray-300 px-2 text-base tabular-nums" />
                <span className="text-gray-400">à</span>
                <input type="time" aria-label={`${DAY_NAMES[i]} fermeture`} value={d.close} step={900} onChange={(e) => set(i, { close: e.target.value })} className="h-10 rounded-lg border border-gray-300 px-2 text-base tabular-nums" />
                {overnight && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">ferme après minuit</span>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
