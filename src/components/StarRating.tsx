import { Star } from "lucide-react";

export function StarRating({ value }: { value: number }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full || (i === full && hasHalf);
        return <Star key={i} className={`h-4 w-4 ${filled ? "fill-emerald-500 text-emerald-500" : "text-gray-300"}`} />;
      })}
      <span className="ml-1 text-xs text-gray-600">{value.toFixed(1)}</span>
    </div>
  );
}

