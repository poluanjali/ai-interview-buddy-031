type Props = {
  seconds: number;
  total: number;
  label: string;
};

export function CountdownTimer({ seconds, total, label }: Props) {
  const progress = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2">
      <div className="relative h-12 w-12 shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted/30"
          />
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-primary transition-[stroke-dashoffset] duration-300 ease-linear"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
          {seconds}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground">Auto-submit on silence</span>
      </div>
    </div>
  );
}
