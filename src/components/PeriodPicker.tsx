import { PeriodKey, getPeriodRange, PeriodRange } from "@/lib/commissions";
import { useEffect, useState } from "react";

export function PeriodPicker({
  value,
  custom,
  onChange,
}: {
  value: PeriodKey;
  custom: { from: string; to: string };
  onChange: (key: PeriodKey, custom: { from: string; to: string }, range: PeriodRange) => void;
}) {
  const [from, setFrom] = useState(custom.from);
  const [to, setTo] = useState(custom.to);

  useEffect(() => {
    setFrom(custom.from);
    setTo(custom.to);
  }, [custom.from, custom.to]);

  const emit = (key: PeriodKey, f: string, t: string) => {
    const c = { from: f, to: t };
    onChange(key, c, getPeriodRange(key, c));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={value}
        onChange={(e) => emit(e.target.value as PeriodKey, from, to)}
        className="bg-input rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="today">Hoje</option>
        <option value="week">Esta semana</option>
        <option value="month">Este mês</option>
        <option value="lastMonth">Mês anterior</option>
        <option value="custom">Personalizado</option>
      </select>
      {value === "custom" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => {
              setFrom(e.target.value);
              emit("custom", e.target.value, to);
            }}
            className="bg-input rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          <span>até</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => {
              setTo(e.target.value);
              emit("custom", from, e.target.value);
            }}
            className="bg-input rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
    </div>
  );
}