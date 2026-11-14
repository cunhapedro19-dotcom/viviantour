export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "success" | "info";
}) {
  const tones: Record<string, string> = {
    default: "text-tinta",
    warning: "text-amber-600",
    success: "text-emerald-600",
    info: "text-sky-600",
  };
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-tinta-mute">{label}</p>
      <p className={`mt-1.5 font-display text-2xl font-semibold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-tinta-mute">{hint}</p>}
    </div>
  );
}
