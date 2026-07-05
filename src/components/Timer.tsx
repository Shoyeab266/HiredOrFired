interface TimerProps {
  remainingMinutes: number;
  totalMinutes: number;
}

export default function Timer({ remainingMinutes, totalMinutes }: TimerProps) {
  const percentage = (remainingMinutes / totalMinutes) * 100;
  const isLow = remainingMinutes <= 3;
  const minutes = Math.floor(remainingMinutes);
  const seconds = Math.floor((remainingMinutes - minutes) * 60);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isLow ? "bg-red-500" : "bg-brand-500"
          }`}
          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
        />
      </div>
      <span
        className={`text-sm font-mono font-medium tabular-nums ${
          isLow ? "text-red-600" : "text-slate-600"
        }`}
      >
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
}
